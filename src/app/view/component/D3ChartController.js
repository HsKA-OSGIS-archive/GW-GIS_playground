/* Copyright (c) 2015-present terrestris GmbH & Co. KG
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @class Koala.view.component.D3ChartController
 */
Ext.define('Koala.view.component.D3ChartController', {
    extend: 'Koala.view.component.D3BaseController',
    alias: 'controller.component-d3chart',
    requires: [
        'Koala.util.ChartData',
        'Koala.util.ChartConstants'
    ],
    /**
     *
     */
    scales: {},
    shapes: [],
    attachedSeriesVisibleById: {},
    axes: {},
    gridAxes: {},
    tooltipCmp: null,
    zoomInteraction: null,
    initialPlotTransform: null,
    data: {},
    rawData: null,
    gridFeatures: null,
    /**
     * Contains the DateValues of the charts current zoom extent.
     * @type {Object}
     */
    currentDateRange: {
        min: null,
        max: null
    },
    /**
     * Whether the chart is actually being rendered.
     *
     * @type {Boolean}
     */
    chartRendered: false,
    /**
     * An object that holds all requests we issue for fetching series data. It
     * is keyed by the id of a selectedStation. We need this in order to be able
     * to manually abort pending requests in the case of repeatedly adding
     * series.
     *
     * It is filled in #getChartDataForStation, updated once any data request
     * finishes and fully emptied in #getChartData via #abortPendingRequests.
     *
     * @type {Object}
     */
    ajaxRequests: {},
    /**
     * A counter for all our data requests. Increased in #getChartDataForStation
     * and reset in #getChartData. Once all expected chart data has arrived, we
     * set #chartDataAvailable to true and fire #chartdataprepared.
     * @type {Number}
     */
    ajaxCounter: 0,
    /**
     * Whether all data requests have finished and the chart data is actually
     * available.
     *
     * @type {Boolean}
     */
    chartDataAvailable: false,

    /**
     * Fired once all chart data is available from the data requests.
     *
     * @event chartdataprepared
     */
    featuresByStation: {},
    /**
     * Called on initialize event. Only used in modern toolkit.
     *
     * @private
     */
    onInitialize: function() {
        var me = this;
        me.onBoxReady();
    },

    /**
     *
     */
    drawChart: function() {
        if (!this.chartConfig) {
            return;
        }
        var me = this;

        me.currentDateRange = {
            min: null,
            max: null
        };

        var series = new D3Util.TimeseriesComponent(this.chartConfig.timeseriesComponentConfig);
        this.timeseriesComponent = series;
        series.enableYAxisZoom(false);

        if (this.keydownDestroy) {
            this.keydownDestroy.destroy();
            this.keyupDestroy.destroy();
        }

        this.keydownDestroy = Ext.getBody().on('keydown', function(event) {
            if (event.shiftKey) {
                // removed stopping of event propagation for now, if there was
                // a reason for this, we'd probably need further checks on the
                // event target
                series.enableYAxisZoom(true);
            }
        }, this, {
            destroyable: true
        });
        this.keyupDestroy = Ext.getBody().on('keyup', function(event) {
            series.enableYAxisZoom(event.shiftKey);
        }, this, {
            destroyable: true
        });
        var legend = this.getLegendComponent(series);

        this.chartConfig.chartRendererConfig.components = [series];
        if (legend) {
            this.chartConfig.chartRendererConfig.components.push(legend);
        }
        this.chartRenderer = new D3Util.ChartRenderer(this.chartConfig.chartRendererConfig);
        var div = this.getView().el.dom;
        this.chartRenderer.render(div);
    },

    /**
     * Constructs a new legend component based on current config, or undefined,
     * if we have no legend config.
     * @param  {D3Util.TimeseriesComponent} series the corresponding time series
     * component
     * @return {D3Util.LegendComponent} the new legend component, or undefined
     */
    getLegendComponent: function(series) {
        if (!this.chartConfig.legendComponentConfig) {
            return;
        }
        var me = this;
        var config = me.getView().getConfig();
        var gnosConfig = config.targetLayer.metadata.layerConfig.timeSeriesChartProperties;
        var Const = Koala.util.ChartConstants;
        var CSS = Const.CSS_CLASS;
        Ext.each(this.chartConfig.legendComponentConfig.items, function(legend, idx) {
            var station = Ext.Array.findBy(me.getView().getSelectedStations(), function(feature) {
                return feature.get('id') === legend.seriesId;
            });

            legend.onClick = function(event) {
                var list = event.target.classList;
                if (list.contains(CSS.DOWNLOAD_ICON) ||
                    list.contains(CSS.COLOR_ICON) ||
                    list.contains(CSS.DELETE_ICON)) {
                    return;
                }
                series.toggleSeries(legend.seriesIndex);
            };
            if (station) {
                legend.title = Koala.util.String.replaceTemplateStrings(gnosConfig.seriesTitleTpl, station);
                legend.contextmenuHandler = me.getContextmenuFunction(legend.seriesIndex, series).bind(me);
            }
            legend.customRenderer = function(node) {
                var allowDownload = Koala.util.Object.getPathStrOr(
                    config.targetLayer,
                    'metadata/layerConfig/olProperties/allowDownload',
                    true
                );
                allowDownload = Koala.util.String.coerce(allowDownload);
                if (!Ext.isModern && allowDownload && station) {
                    node.append('text')
                    // fa-save from FontAwesome, see http://fontawesome.io/cheatsheet/
                        .text('')
                        .attr('class', CSS.DOWNLOAD_ICON)
                        .attr('text-anchor', 'start')
                        .attr('dy', '1')
                        .attr('dx', '130') // TODO Discuss, do we need this dynamically?
                        .on('click', me.generateDownloadCallback(legend.seriesId));
                }
                if (!Ext.isModern) {
                    node.append('text')
                        // fa-paint-brush from FontAwesome, see http://fontawesome.io/cheatsheet/
                        .text('\uf1fc')
                        .attr('class', CSS.COLOR_ICON)
                        .attr('text-anchor', 'start')
                        .attr('dy', '1')
                        .attr('dx', '150') // TODO Discuss, do we need this dynamically?
                        .on('click', me.generateColorCallback(legend.seriesIndex));
                }
                node.append('text')
                    // ✖ from FontAwesome, see http://fontawesome.io/cheatsheet/
                    .text('')
                    .attr('class', CSS.DELETE_ICON)
                    .attr('text-anchor', 'start')
                    .attr('dy', '1')
                    .attr('dx', '170') // TODO Discuss, do we need this dynamically?
                    .on('click', me.generateDeleteCallback(legend.seriesIndex, idx));
            };
        });
        return new D3Util.LegendComponent(this.chartConfig.legendComponentConfig);
    },

    /**
     * Add a station to the list of managed stations for this chart. Please note
     * that this does not actually render a new series for the station, callers
     * (like e.g. the timeseries window controller) need to ensure that the data
     * is actually fetched and drawn.
     *
     * TODO We may want to refactor this, so the last note isn't needed any
     *      longer. the twc currently simply calls into our own controller and
     *      issues `prepareTimeSeriesLoad`, which we might do as well here…
     *
     * By default the candidate will only be added, if it doesn't already
     * exist (see #containsSeriesFor), but this can be skipped if the second
     * argument (`allowDupes`) is passed as `true`. This method returns whether
     * the feature was actually added.
     *
     * @param {ol.Feature} candidate The feature to add.
     * @param {boolean} [allowDupes] Whether duplicates are allowed. Defaults to
     *     `true`.
     * @return {boolean} Whether the candidate was added.
     */
    addShape: function(shapeConfig, selectedStation, allowDupes) {
        var me = this;
        var view = me.getView();
        var added = false;
        allowDupes = Ext.isDefined(allowDupes) ? allowDupes : false;
        if (allowDupes === true || !me.containsStation(selectedStation)) {
            view.getSelectedStations().push(selectedStation);
            view.getShapes().push(shapeConfig);
            // update the chart to reflect the changes
            me.getChartData();
            added = true;
        }
        return added;
    },

    /**
     * Zoom to another time interval on the x axis.
     * @param  {moment} d0 left boundary
     * @param  {moment} d1 right boundary
     */
    zoomToInterval: function(d0, d1) {
        var me = this;
        var chartId = '#' + me.getView().getId() + ' svg';
        var svg = d3.select(chartId);
        var width = me.getChartSize()[0];
        var x = me.scales['bottom'];
        svg.call(me.zoomInteraction)
            .call(me.zoomInteraction.transform, d3.zoomIdentity
                .scale(width / (x(d1) - x(d0)))
                .translate(-x(d0), 0)
            );
    },

    /**
     *
     */
    createShapes: function() {
        var me = this;
        var Const = Koala.util.ChartConstants;
        var Chart = Koala.util.Chart;
        var view = me.getView();
        var chartSize = me.getChartSize();

        // Start from scratch, we'll assign new shapes below.
        // Alternatively we could reuse the `shape`, if we detect that
        // it already exists in the `shapes` array.
        me.shapes = [];
        me.attachedSeriesShapes = [];

        Ext.each(view.getShapes(), function(shapeConfig) {
            var shapeType = Const.TYPE[shapeConfig.type || 'line'];
            var curveType = Const.CURVE[shapeConfig.curve || 'linear'];
            var xField = shapeConfig.xField;
            var yField = shapeConfig.yField;
            var orientX = me.getAxisByField(xField);
            var orientY = me.getAxisByField(yField);
            var normalizeX = me.scales[orientX];
            var normalizeY = me.scales[orientY];
            var shape;

            if (shapeType) {
                shape = Chart.createShape(shapeType, curveType, xField, yField, normalizeX, normalizeY, chartSize);
            }

            var shapeObj = {
                config: shapeConfig,
                shape: shape
            };
            me.shapes.push(shapeObj);
            if (!me.attachedSeriesVisibleById[shapeConfig.id]) {
                me.attachedSeriesVisibleById[shapeConfig.id] = [];
            }
        });
    },

    createAttachedSeriesShapes: function() {
        var Const = Koala.util.ChartConstants;
        var Chart = Koala.util.Chart;
        var chartSize = this.getChartSize();
        var me = this;
        me.attachedSeriesShapes = [];

        Ext.each(this.getView().getShapes(), function(shapeConfig) {
            var shapeType = Const.TYPE[shapeConfig.type || 'line'];
            var curveType = Const.CURVE[shapeConfig.curve || 'linear'];
            var xField = shapeConfig.xField;
            var orientX = me.getAxisByField(xField);
            var normalizeX = me.scales[orientX];

            var attachedSeries = shapeConfig.attachedSeries ?
                JSON.parse(shapeConfig.attachedSeries) : [];

            if (!me.attachedSeriesVisibleById[shapeConfig.id]) {
                me.attachedSeriesVisibleById[shapeConfig.id] = [];
            }

            var idx = 0;
            Ext.each(attachedSeries, function(config) {
                shapeConfig = Ext.clone(shapeConfig);
                shapeConfig.color = config.color || shapeConfig.color;
                shapeConfig.yField = config.yAxisAttribute;
                shapeConfig.orientY = 'left';
                var scale = me.attachedSeriesScales[idx];
                shapeConfig.attachedSeriesNumber = ++idx;
                var shape = Chart.createShape(shapeType, curveType, xField, config.yAxisAttribute, normalizeX, scale, chartSize);
                me.attachedSeriesShapes.push({
                    config: shapeConfig,
                    shape: shape
                });
            });
        });
    },

    /**
     *
     */
    getAxisByField: function(field) {
        var view = this.getView();
        var axisOrientation = 'left';

        Ext.iterate(view.getAxes(), function(orient, axisConfig) {
            if (axisConfig.dataIndex === field) {
                axisOrientation = orient;
                return false; // break early
            }
        });

        return axisOrientation;
    },

    /**
     * Register keyboard handler to detect keypress
     */
    registerKeyboardHandler: function(me) {
        Ext.getBody().on('keydown', function(event) {
            if (event.shiftKey) {
                // removed stopping of event propagation for now, if there was
                // a reason for this, we'd probably need further checks on the
                // event target
                me.zoomYAxisBtnPressed = true;
            }
        });
        Ext.getBody().on('keyup', function(event) {
            me.zoomYAxisBtnPressed = event.shiftKey;
        });
    },

    /**
     * Handle resize events to update the chart config.
     */
    handleResize: function() {
        if (!this.chartConfig) {
            return;
        }
        var config = this.getView().getConfig();
        var gnosConfig = config.targetLayer.metadata.layerConfig.timeSeriesChartProperties;
        var margin = gnosConfig.chartMargin.split(',');
        margin = Ext.Array.map(margin, function(w) {
            return parseInt(w, 10);
        });
        var chartSize = this.getViewSize();
        // set the size
        this.chartConfig.timeseriesComponentConfig.size = [chartSize[0] - margin[1] - margin[3], chartSize[1] - margin[0] - margin[2]];
        this.chartConfig.timeseriesComponentConfig.position = [margin[3], margin[0]];
        if (this.chartConfig.legendComponentConfig) {
            this.chartConfig.legendComponentConfig.position = [chartSize[0] - margin[1], margin[0]];
        } else {
            this.chartConfig.timeseriesComponentConfig.size[0] += margin[1];
        }
        this.chartConfig.chartRendererConfig.size = chartSize;

        this.drawChart();
    },

    /**
     * Reset the chart zoom to full extent.
     */
    resetZoom: function() {
        var me = this;
        var prevented = this.timeseriesComponent.preventYAxisZoom;
        if (prevented) {
            this.timeseriesComponent.enableYAxisZoom(true);
        }
        this.chartRenderer.resetZoom();
        if (prevented) {
            // need a timeout here because the zoom reset is animated
            window.setTimeout(function() {
                me.timeseriesComponent.enableYAxisZoom(false);
            }, 800);
        }
    },

    /**
     * Get the legend entry contextmenu callback function.
     * @param  {Object} shape the shape the contextmenu callback is for.
     * @return {function}       the callback that might show the attached series
     * contextmenu if attached series are configured.
     */
    getContextmenuFunction: function(seriesIndex, component) {
        var me = this;
        return function(event) {
            // we only have a d3 event in classic
            if (event) {
                event.preventDefault();
            }
            var attached = [];
            var timeConfig = this.chartConfig.timeseriesComponentConfig;
            Ext.each(timeConfig.series, function(config, idx) {
                if (config.belongsTo === seriesIndex) {
                    attached.push(idx);
                }
            });
            var attachedConfig = me.getView().getConfig().targetLayer.metadata.layerConfig.timeSeriesChartProperties.attachedSeries;
            if (attachedConfig) {
                var series = JSON.parse(attachedConfig);
                var items = [];
                Ext.each(series, function(config, index) {
                    var visible = component.visible(attached[index + 1]);
                    items.push({
                        xtype: 'checkboxfield',
                        fieldLabel: config.dspUnit,
                        label: config.dspUnit,
                        checked: visible,
                        listeners: {
                            change: function() {
                                var zoom = component.getCurrentZoom();
                                timeConfig.initialZoom = {
                                    x: zoom.x,
                                    y: zoom.y,
                                    k: zoom.k
                                };
                                var cur = timeConfig.series[attached[index + 1]].initiallyVisible;
                                timeConfig.series[attached[index + 1]].initiallyVisible = !cur;
                                me.drawChart();
                            }
                        }
                    });
                });
                if (items.length > 0) {
                    var menuType = 'Ext.menu.Menu';
                    if (Ext.isModern) {
                        menuType = 'Ext.Menu';
                    }
                    var menu = Ext.create(menuType, {
                        items: items
                    });
                    if (Ext.isClassic) {
                        menu.showAt(event.clientX, event.clientY);
                    } else {
                        menu.show();
                    }
                }
            }
        };
    },
    /**
     * Downloads the current visibile data for this series.
     *
     * @param {Object} dataObj The config object of the selected Series.
     */
    downloadSeries: function(dataObj) {
        var me = this;
        var viewModel = me.getViewModel();
        var win = Ext.create('Ext.window.Window', {
            title: viewModel.get('downloadChartDataMsgTitle'),
            name: 'downloaddatawin',
            width: 300,
            layout: 'fit',
            bodyPadding: 10,
            items: [{
                xtype: 'container',
                items: [{
                    padding: '5 0 0 0',
                    html: viewModel.get('downloadChartDataMsgMessage')
                }, {
                    xtype: 'checkboxfield',
                    fieldLabel: viewModel.get('downloadAllText'),
                    value: true
                }, {
                    xtype: 'combo',
                    id: 'formatCombo',
                    width: '100%',
                    fieldLabel: viewModel.get('outputFormatText'),
                    value: 'csv',
                    forceSelection: true,
                    store: [
                        ['gml3','gml'],
                        ['csv','csv'],
                        ['application/json','json']
                    ],
                    listeners: {
                        'select': me.onDownloadFormatSelected
                    }
                }, {
                    xtype: 'combo',
                    id: 'delimiterCombo',
                    width: '100%',
                    hidden: false, //initially visible because default value of formatCombo === 'csv'
                    fieldLabel: viewModel.get('delimiterText'),
                    labelWidth: 120,
                    value: ',',
                    forceSelection: true,
                    store: [
                        [',', ','],
                        [';', ';'],
                        ['|', '|'],
                        ['\t', 'tab']
                    ]
                }, {
                    xtype: 'checkbox',
                    id: 'quoteCheckbox',
                    hidden: false, //initially visible because default value of formatCombo === 'csv'
                    fieldLabel: viewModel.get('quoteText'),
                    labelWidth: 120,
                    value: true
                }]
            }],
            bbar: [{
                text: viewModel.get('downloadChartDataMsgButtonYes'),
                name: 'confirm-timeseries-download',
                handler: me.downloadChartData.bind(me, dataObj)
            }, {
                text: viewModel.get('downloadChartDataMsgButtonNo'),
                name: 'abort-timeseries-download',
                handler: function() {
                    this.up('window').close();
                }
            }]
        });
        win.show();
    },
    /**
     * toggles visibility of delimiterCombo & quoteCheckbox
     * depending on selected download format
     */
    onDownloadFormatSelected: function(combo, record) {
        var me = this;
        var delimiterCombo = me.up().down('combo[id="delimiterCombo"]');
        var quoteCheckbox = me.up().down('checkbox[id="quoteCheckbox"]');
        if (record.get('field2') === 'csv') {
            delimiterCombo.setHidden(false);
            quoteCheckbox.setHidden(false);
        } else {
            delimiterCombo.setHidden(true);
            quoteCheckbox.setHidden(true);
        }
    },
    /**
     * Converts the download features to GeoJSON and downloads via data uri.
     *
     * @param {String} stationId The config object of the selected Series.
     * @param {Ext.button.Button} btn The button we clicked on.
     */
    downloadChartData: function(stationId, btn) {
        var win = btn.up('window');
        var formatCombo = win.down('combo[id="formatCombo"]');
        var checkbox = win.down('checkboxfield');
        var delimiterCombo = win.down('combo[id="delimiterCombo"]');
        var quoteCheckbox = win.down('checkbox[id="quoteCheckbox"]');
        var format = formatCombo.getValue();
        var all = checkbox.getValue();
        var features = [];
        if (all) {
            Ext.iterate(this.featuresByStation, function(id, feats) {
                features = features.concat(feats);
            });
        } else {
            features = this.featuresByStation[stationId];
        }
        var fmt;
        switch (format) {
            case 'gml3': {
                fmt = new ol.format.GeoJSON();
                features = fmt.readFeatures({
                    type: 'FeatureCollection',
                    features: features
                });
                fmt = new ol.format.GML3({
                    featureNS: 'http://www.bfs.de/namespace',
                    featureType: 'Measure'
                });
                features = fmt.writeFeatures(features);
                break;
            }
            case 'application/json': {
                features = JSON.stringify({
                    type: 'FeatureCollection',
                    features: features
                });
                break;
            }
            case 'csv': {
                features = features.map(function(feature) {
                    return feature.properties;
                });
                var delimiter = delimiterCombo.getSelectedRecord().get('field1');
                var quoteStrings = quoteCheckbox.getValue();
                var config = {
                    delimiter: delimiter,
                    quotes: quoteStrings,
                    quoteChar: '"',
                    fastMode: false
                };
                features = Papa.unparse(features, config);
                break;
            }
            default: {
                Ext.log('Unhandled format: ' + format);
            }
        }
        var layerName = this.getView().config.name.replace(' ','_');
        var fileEnding = formatCombo.getSelectedRecord().get('field2');
        download(features, layerName + '.' + fileEnding, format);
        win.close();
    },
    /**
     *
     */
    deleteEverything: function(index, legendIndex) {
        var attached = [];
        Ext.each(this.chartConfig.timeseriesComponentConfig.series, function(config, idx) {
            if (config.belongsTo === index) {
                attached.push(idx);
            }
        });
        this.chartConfig.timeseriesComponentConfig.series =
            this.chartConfig.timeseriesComponentConfig.series.filter(function(config, idx) {
                if (attached.indexOf(idx) !== -1) {
                    return false;
                }
                return true;
            });
        this.chartConfig.legendComponentConfig.items.splice(legendIndex, 1);
        this.drawChart();
    },

    /**
     *
     */
    getChartData: function() {
        var me = this;
        var view = me.getView();
        if (view.getShowLoadMask() && view.getSelectedStations().length > 0) {
            view.setLoading(true);
        }
        me.data = {};
        me.featuresByStation = {};
        me.chartDataAvailable = false;
        me.abortPendingRequests();
        Ext.each(view.getSelectedStations(), function(station) {
            me.getChartDataForStation(station);
        });
    },
    /**
     * Aborts any loading requests in our internal pending requests object and
     * resets both #ajaxRequests and #ajaxCounter.
     */
    abortPendingRequests: function() {
        var me = this;
        Ext.iterate(me.ajaxRequests, function(id, ajaxRequest) {
            if (ajaxRequest && ajaxRequest.isLoading()) {
                ajaxRequest.abort();
            }
        });
        me.ajaxRequests = {};
        me.ajaxCounter = 0;
    },
    /**
     * TODO gettestdatafilter and set to request URL // CQL ticket #1578
     */
    getChartDataForStation: function(selectedStation) {
        var me = this;
        var layer = selectedStation.get('layer');
        // layer may be undefined in mobile environment
        if (!layer) {
            var view = me.getView();
            layer = view.getTargetLayer();
        }
        var chartProperties = layer.get('timeSeriesChartProperties');
        // The id of the selected station is also the key in the pending
        // requests object.
        var stationId = selectedStation.get(chartProperties.featureIdentifyField || 'id');
        // Store the actual request object, so we are able to abort it if we are
        // called faster than the response arrives.
        var ajaxRequest = me.getChartDataRequest(
            selectedStation,
            me.onChartDataRequestCallback,
            me.onChartDataRequestSuccess,
            me.onChartDataRequestFailure,
            me
        );
        // Put the current request into our storage for possible abortion.
        me.ajaxRequests[stationId] = ajaxRequest;
    },
    /**
     * Returns the request params for a given station.
     *
     * @param {ol.Feature} station The station to build the request for.
     * @param {Boolean} useCurrentZoom Whether to use the currentZoom of the
     *                                 chart or not. Default is false.
     * @return {Object} The request object.
     */
    getChartDataRequestParams: function(station, useCurrentZoom) {
        var me = this;
        var Ogc = Koala.util.Ogc;
        var view = me.getView();
        var targetLayer = view.getTargetLayer();
        var chartConfig = targetLayer.get('timeSeriesChartProperties');
        var startDate = view.getStartDate();
        var endDate = view.getEndDate();
        var filterConfig = Koala.util.Filter.getStartEndFilterFromMetadata(
            targetLayer.metadata);
        var timeField = filterConfig.parameter;
        var startString = startDate.toISOString();
        var endString = endDate.toISOString();
        if (useCurrentZoom === true && me.currentDateRange.min &&
                me.currentDateRange.max) {
            startString = moment.utc(me.currentDateRange.min).toISOString();
            endString = moment.utc(me.currentDateRange.max).toISOString();
        }
        // Get the viewparams configured for the layer
        var layerViewParams = Koala.util.Object.getPathStrOr(
            targetLayer, 'metadata/layerConfig/olProperties/param_viewparams', '');
        // Get the request params configured for the chart
        var paramConfig = Koala.util.Object.getConfigByPrefix(
            chartConfig, 'param_', true);
        // Merge the layer viewparams to the chart params
        paramConfig.viewparams = paramConfig.viewparams
            ? paramConfig.viewparams + ';' + layerViewParams
            : layerViewParams;
        // Replace all template strings
        Ext.iterate(paramConfig, function(k, v) {
            paramConfig[k] = Koala.util.String.replaceTemplateStrings(
                v, station);
        });
        var filter = Ogc.getWfsFilter(station, startString, endString, timeField, targetLayer);
        var requestParams = {
            service: 'WFS',
            version: '1.1.0',
            request: 'GetFeature',
            typeName: chartConfig.dataFeatureType,
            outputFormat: 'application/json',
            filter: filter,
            sortBy: timeField,
            viewParams: targetLayer.getSource().getParams().viewparams
        };
        Ext.apply(requestParams, paramConfig);
        return requestParams;
    },
    /**
     * Returns the WFS url of the current charting target layer.
     *
     * @return {String} The WFS url.
     */
    getChartDataRequestUrl: function() {
        var me = this;
        var view = me.getView();
        var targetLayer = view.getTargetLayer();
        var requestUrl = Koala.util.Object.getPathStrOr(targetLayer,
            'metadata/layerConfig/wfs/url');
        return requestUrl;
    },
    /**
     * Returns the Ext.Ajax.request for requesting the chart data.
     *
     * @param {ol.Feature} station The ol.Feature to build the request function
     *                             for. Required.
     * @param {Function} cbSuccess The function to be called on success. Optional.
     * @param {Function} cbFailure The function to be called on failure. Optional.
     * @param {Function} cbScope The callback function to be called on
     *                           success and failure. Optional.
     * @return {Ext.Ajax.request} The request function.
     */
    getChartDataRequest: function(station, cbFn, cbSuccess, cbFailure, cbScope) {
        var me = this;
        if (!(station instanceof ol.Feature)) {
            Ext.log.warn('No valid ol.Feature given.');
            return;
        }
        var ajaxRequest = Ext.Ajax.request({
            method: 'GET',
            url: me.getChartDataRequestUrl(),
            params: me.getChartDataRequestParams(station),
            callback: function() {
                if (Ext.isFunction(cbFn)) {
                    cbFn.call(cbScope, station);
                }
            },
            success: function(response) {
                if (Ext.isFunction(cbSuccess)) {
                    cbSuccess.call(cbScope, response, station);
                }
            },
            failure: function(response) {
                if (Ext.isFunction(cbFailure)) {
                    cbFailure.call(cbScope, response, station);
                }
            }
        });
        return ajaxRequest;
    },
    /**
     * The default callback handler for chart data requests.
     *
     * @param {ol.Feature} station The station the corresponding request was
     *                             send for.
     */
    onChartDataRequestCallback: function(station) {
        var me = this;
        var view = me.getView();
        if (!view) {
            return;
        }
        var chartProps = view.getTargetLayer().get('timeSeriesChartProperties');
        // The id of the selected station is also the key in the pending
        // requests object.
        var stationId = station.get(chartProps.featureIdentifyField || 'id');
        // Called for both success and failure, this will delete the
        // entry in the pending requests object.
        if (stationId in me.ajaxRequests) {
            delete me.ajaxRequests[stationId];
        }
    },
    /**
     * Function to be called on request success.
     *
     * @param {Object} reponse The response object.
     * @param {ol.Feature} station The station the corresponding request was
     *                             send for.
     */
    onChartDataRequestSuccess: function(response, station) {
        var me = this;
        var view = me.getView();
        if (!view) {
            return;
        }
        var targetLayer = view.getTargetLayer();
        var startDate = view.getStartDate().clone();
        var endDate = view.getEndDate().clone();
        var chartConfig = targetLayer.get('timeSeriesChartProperties');
        var data;
        if (response && response.responseText) {
            try {
                data = Ext.decode(response.responseText);
            } catch (err) {
                Ext.log.error('Could not parse the response: ', err);
                return false;
            }
        }
        me.rawData = response.responseText;
        //used for grid table in CartoWindowController
        me.gridFeatures = Ext.clone(data.features);
        var seriesData = Koala.util.ChartData.convertToTimeseriesData(
            chartConfig,
            data,
            targetLayer,
            station,
            startDate,
            endDate,
            view.getShowIdentificationThresholdData()
        );
        me.chartDataAvailable = true;
        // The id of the selected station is also the key in the pending
        // requests object.
        //TODO: response shouldnt be restricted on id
        var stationId = station.get(chartConfig.featureIdentifyField || 'id');
        me.featuresByStation[stationId] = data.features;
        me.data[stationId] = seriesData;
        me.ajaxCounter++;
        if (me.ajaxCounter === view.getSelectedStations().length) {
            if (view.getShowLoadMask()) {
                view.setLoading(false);
            }
            var config = me.getView().getConfig();
            var chartSize = me.getViewSize();
            var stations = me.getView().getSelectedStations();
            me.chartConfig = Koala.util.ChartData.getChartConfiguration(
                config,
                chartSize,
                'timeSeries',
                this.data,
                undefined,
                stations
            );
            me.fireEvent('chartdataprepared');
        }
    },
    /**
     * Returns whether this chart currently contains a series for the passed
     * feature or not. In order for this method to properly work, you will need
     * to specify a valid `featureIdentifyField` in the current layers
     * `timeSeriesChartProperties`.
     *
     * @param {ol.Feature} candidate The feature to check.
     * @return {boolean} Whether the candidate is already represented inside
     *     this chart.
     */
    containsStation: function(candidate) {
        var me = this;
        var view = me.getView();
        var chartingMetadata = view.getTargetLayer().get('timeSeriesChartProperties');
        var identifyField = chartingMetadata.featureIdentifyField || 'id';
        var candidateIdVal = candidate.get(identifyField);
        var doesContainSeries = false;
        if (!Ext.isDefined(candidateIdVal)) {
            Ext.log.warn('Failed to determine if chart contains a series for ' +
                'the passed feature. Does it expose a field \'' + identifyField +
                '\' with a sane value?');
        } else {
            var currentStations = view.getSelectedStations();
            Ext.each(currentStations, function(currentStation) {
                var currentStationIdVal = currentStation.get(identifyField);
                if (currentStationIdVal === candidateIdVal) {
                    doesContainSeries = true;
                    return false; // …stop iterating
                }
            });
        }
        return doesContainSeries;
    },

    /**
     * Toggles an axis scale back and forth between linear and logarithmic.
     * @param  {String|undefined} axis if not given, the 'y' scale is toggled
     */
    toggleScale: function(axis) {
        if (!axis) {
            axis = 'y';
        }
        var cfg = this.chartConfig.timeseriesComponentConfig.axes[axis];
        var scale = cfg.scale;
        scale = scale === 'linear' ? 'log' : 'linear';
        cfg.scale = scale;
        cfg.harmonize = scale === 'log';
        cfg.autoTicks = scale === 'log';
        this.drawChart();
    }
});
