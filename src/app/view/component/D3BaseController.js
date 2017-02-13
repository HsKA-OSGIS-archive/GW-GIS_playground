/* Copyright (c) 2015-2016 terrestris GmbH & Co. KG
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
  * A base class for both the D3ChartController and the D3BarChartController.
  *
  * @class Koala.view.component.D3BaseController
  */
Ext.define('Koala.view.component.D3BaseController', {
    extend: 'Ext.app.ViewController',
    inheritableStatics: {
        SVG_DEFS: {
            LEGEND_ICON_BACKGROUND: 'M-3 -14 h 25 v 16 h -25 Z',
            LEGEND_ICON_AREA: 'M0 -6 C 3 0, 7 0, 10 -6 S 15 -12, 20 -6 M20 -6 v 6 h -20 v -6 Z',
            LEGEND_ICON_BAR: 'M0 -10 h 6 v 12 h -6 Z M7 -6 h 6 v 8 h -6 Z M14 -10 h 6 v 12 h -6 Z',
            LEGEND_ICON_LINE: 'M0 -6 C 3 0, 7 0, 10 -6 S 15 -12, 20 -6'
        },
        /**
         * An object containing CSS classes and parts (suffixes, prefixes) to
         * generate CSS classes.
         *
         * @type {Object}
         */
        CSS_CLASS: {
            AXIS: 'k-d3-axis',
            AXIS_X: 'k-d3-axis-x',
            AXIS_Y: 'k-d3-axis-y',

            PLOT_BACKGROUND: 'k-d3-plot-background',

            GRID: 'k-d3-grid',
            GRID_X: 'k-d3-grid-x',
            GRID_Y: 'k-d3-grid-y',

            SHAPE_GROUP: 'k-d3-shape-group',
            BAR: 'k-d3-bar',
            SHAPE_PATH: 'k-d3-shape-path',
            SHAPE_POINT_GROUP: 'k-d3-shape-points',
            LEGEND_CONTAINER: 'k-d3-scrollable-legend-container',
            DELETE_ICON: 'k-d3-delete-icon',

            AXIS_LABEL: 'k-d3-axis-label',
            AXIS_LABEL_X: 'k-d3-axis-label-x',
            AXIS_LABEL_Y: 'k-d3-axis-label-y',

            PREFIX_IDX_SHAPE_GROUP: 'shape-group-',
            PREFIX_IDX_SHAPE_PATH: 'shape-path-',
            PREFIX_IDX_SHAPE_POINT_GROUP: 'shape-points-',
            PREFIX_IDX_LEGEND_GROUP: 'legend-group-',

            SUFFIX_LEGEND: '-legend',
            SUFFIX_HIDDEN: '-hidden'
        },

        /**
         * Additional margin to take into consideration when calculating the
         * width of the bars.
         *
         * @type {Number}
         */
        ADDITIONAL_BAR_MARGIN: 5,

        /**
         * Static mapping of supported D3 axis generators. See the
         * {@link https://github.com/d3/d3-axis/blob/master/README.md#axisTop|D3 API documentation}
         * for further details.
         *
         * @type {function} top - Return a top-oriented axis generator.
         * @type {function} right - Return a right-oriented axis generator.
         * @type {function} bottom - Return a bottom-oriented axis generator.
         * @type {function} left - Return a left-oriented axis generator.
         */
        ORIENTATION: {
            top: d3.axisTop,
            right: d3.axisRight,
            bottom: d3.axisBottom,
            left: d3.axisLeft
        },

        /**
         * Static mapping of supported d3 scales. In D3 Scales are functions that
         * map from an input domain to an output range. See the
         * {@link https://github.com/d3/d3/blob/master/API.md#scales-d3-scale|D3 API documentation}
         * for further details.
         *
         * @type {function} linear - Return a quantitative linear scale.
         * @type {function} pow - Return a quantitative power scale.
         * @type {function} sqrt - Return a quantitative power scale with exponent 0.5.
         * @type {function} log - Return a quantitative logarithmic scale.
         * @type {function} ident - Return a quantitative identity scale.
         * @type {function} time - Return a linear scale for time.
         * @type {function} utc - Return a linear scale for UTC.
         */
        SCALE: {
            linear: d3.scaleLinear,
            pow: d3.scalePow,
            sqrt: d3.scaleSqrt,
            log: d3.scaleLog,
            ident: d3.scaleIdentity,
            time: d3.scaleTime,
            ordinal: d3.scaleBand
        },

        /**
         * Static mapping of supported d3 shape types. See the
         * {@link https://github.com/d3/d3/blob/master/API.md#shapes-d3-shape|D3 API documentation}
         * for further details.
         *
         * @type {function} line - Return a line generator.
         * @type {function} area - Return an area generator.
         * @type {function} bar - TODO
         */
        TYPE: {
            line: d3.line,
            area: d3.area,
            // TODO: set another type?!
            bar: d3.line
        },

        /**
         * Static mapping of supported d3 curve types. In D3 the curve type
         * represents the interpolation between points in a continous shape. See
         * the {@link https://github.com/d3/d3/blob/master/API.md#curves|D3 API documentation}
         * for further details.
         *
         * @type {function} linear - A polyline through specified points.
         * @type {function} cubicBasisSpline - A cubic basis spline using the
         *       specified control points.
         * @type {function} curveMonotoneX - A cubic spline that preserves
         *       monotonicity in y, assuming monotonicity in x.
         * @type {function} naturalCubicSpline - A natural cubic spline with the
         *       second derivative of the spline set to zero at the endpoints.
         * @type {function} curveStep - A piecewise constant function. The y-value
         *       changes at the midpoint of each pair of adjacent x-values.
         * @type {function} curveStepAfter - A piecewise constant function. The
         *       y-value changes after the x-value.
         * @type {function} curveStepBefore - A piecewise constant function. The
         *       y-value changes before the x-value.
         */
        CURVE: {
            linear: d3.curveLinear,
            cubicBasisSpline: d3.curveBasis,
            curveMonotoneX: d3.curveMonotoneX,
            naturalCubicSpline: d3.curveNatural,
            curveStep: d3.curveStep,
            curveStepAfter: d3.curveStepAfter,
            curveStepBefore: d3.curveStepBefore
        },

        /**
         * Given a SVG `<path>` (from a d3 selection), modify the start point by
         * `offsetX` and `offsetY`.
         *
         * Directly modifies the `d`-attribute.
         *
         * @param {Selection} d3Path The path to modify.
         * @param {Number} offsetX The offset in horizontal direction.
         * @param {Number} offsetX The offset in vertical direction.
         */
        adjustPathStart: function(d3Path, offsetX, offsetY) {
            var currentD = d3Path.attr('d');
            var startCoords = currentD.match(/^M([+-]?\d*\.?\d+),([+-]?\d*\.?\d+)/);
            var xCoord = parseFloat(startCoords[1], 10);
            var yCoord = parseFloat(startCoords[2], 10);
            var newX = xCoord + offsetX;
            var newY = yCoord + offsetY;
            var newD = currentD.replace(startCoords[0], 'M' + newX + ',' + newY);
            d3Path.attr('d', newD);
        },

        /**
         * This method will take a d3 object (e.g. from a selection) and adjust its
         * transfrom element to move it on the canvas. The modification is
         * controlled by a `diffObj` which looks like:
         *
         *     {
         *         translate: {
         *             x: -15,
         *             y: 7
         *         }
         *     }
         *
         * The above object means move the object 15 units to the left and seven to
         * the top.
         *
         * The transform attribute is modified directly.
         *
         * @param {Selection} d3Obj The object to manipulate.
         * @param {Object} diffObj A specification which attribute how to modify.
         */
        adjustTransformTranslate: function (d3Obj, diffObj) {
            var staticMe = Koala.view.component.D3BaseController;
            var makeTranslate = staticMe.makeTranslate;
            var currentTransform = d3Obj.attr('transform');

            var regEx = /translate\((\d+),(\d+)\)/;
            if (!currentTransform) {
                currentTransform = makeTranslate(0, 0);
            }
            var newTransform = currentTransform;
            var matches = regEx.exec(currentTransform);
            if (matches) {
                var x = parseFloat(matches[1], 10);
                var y = parseFloat(matches[2], 10);
                x += 'translate' in diffObj ? diffObj.translate.x || 0 : 0;
                y += 'translate' in diffObj ? diffObj.translate.y || 0 : 0;
                var newTranslate = makeTranslate(x, y);
                newTransform = currentTransform.replace(matches[0], newTranslate);
            }
            d3Obj.attr('transform', newTransform);
        },

        /**
         * Returns a string ready to be used in a transform-attribute for the
         * passed parameters `x` and `y`.
         *
         * @param {Number} x The amount to translate in horizontal direction.
         * @param {Number} y The amount to translate in vertical direction.
         * @return {String} A string ready to be used in a transform-attribute.
         */
        makeTranslate: function(x, y) {
            return "translate(" + x + "," + y + ")";
        },

        /**
         * Returns a random color in hexadecimal form '#063EAA'.
         *
         * @return {String} color The random color, e.g. '#6580C6' or '#AC3A97'.
         */
        getRandomColor: (function(){
            var letters = '0123456789ABCDEF'.split('');
            return function() {
                // An alternative approach:
                // return '#'+(Math.random()*0xFFFFFF<<0).toString(16);
                var color = '#';
                for (var i = 0; i < 6; i++ ) {
                    var idx = Math.floor(Math.random() * 16);
                    color += letters[idx];
                }
                return color;
            };
        }()),

        /**
         * Used as the fallback for labeling when no explicity function is
         * provided.
         *
         * @param {mixed} val The value for labeling.
         * @return {mixed} The exact same value that was passed in.
         */
        identity: function(val) {
            return val;
        },

        /**
         * Ensures that the given label is not longer than the specified max
         * length and returns a shortened string (maxLength chars + '…') to be
         * used for labeling.
         *
         * @param {String} labelText The text to use as label.
         * @param {Number} [maxLength] The maximum length, optional.
         * @return {String} A possibly shortened labeltext with an added … if
         *     the input was longer than allowed.
         */
        labelEnsureMaxLength: function(labelText, maxLength) {
            var ensured = labelText || "";
            var maxLen = !Ext.isEmpty(maxLength) ? maxLength : Infinity;
            if (ensured.length > maxLen) {
                ensured = ensured.substring(0, maxLen);
                ensured += '…';
            }
            return ensured;
        }
    },

    /**
     * The SVG element for the legend as returned by d3.
     *
     * @type {Selection} https://developer.mozilla.org/docs/Web/API/Selection
     */
    legendSvg: null,

    /**
     * The width in pixels of the legend.
     *
     * @type {Number}
     */
    legendTargetWidth: 200,

    /**
     * The height of one legend entry in pixels.
     *
     * @type {Number}
     */
    legendEntryTargetHeight: 30,

    /**
     * The current visibility of the legend container.
     *
     * @private
     * @type {Boolean}
     */
    legendVisible: true,

    /**
     * The default chart margin to apply.
     *
     * @type {Object}
     */
    defaultChartMargin: {
        top: 10,
        right: 200,
        bottom: 20,
        left: 40
    },

    /**
     * Interface method to be overrriden in child classes.
     */
    redrawChart: function() {
        Ext.Logger.warn('Empty interface method.');
    },

    /**
     * Returns the current size of the view element.
     *
     * @return {Array<Number>} An array of width (index 0) and height (index 1).
     */
    getViewSize: function() {
        var me = this;
        var view = me.getView();
        var viewSize = view.el.getSize();

        return [
            viewSize.width,
            viewSize.height
        ];
    },

    /**
     * Returns the chart size as array of width at index 0 & height at index 1.
     * @return {Array<Number>} An array of width (index 0) and height (index 1).
     */
    getChartSize: function() {
        var me = this;
        var view = me.getView();
        var viewSize = me.getViewSize();
        var chartMargin = view.getChartMargin() || me.defaultChartMargin;

        return [
            viewSize[0] - chartMargin.left - chartMargin.right,
            viewSize[1] - chartMargin.top - chartMargin.bottom
        ];
    },

    /**
     * Creates a simple ExtJS tooltip, see the
     * {@link http://docs.sencha.com/extjs/6.0.0/classic/Ext.tip.ToolTip.html|ExtJS API documentation}
     * for further details and config options.
     */
    createTooltip: function() {
        this.tooltipCmp = Ext.create('Ext.tip.ToolTip');
    },

    /**
     * Draws the root <svg>-element into the <div>-element rendered by the
     * Ext component.
     */
    drawSvgContainer: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var CSS = staticMe.CSS_CLASS;
        var makeTranslate = staticMe.makeTranslate;
        var view = me.getView();
        var viewId = '#' + view.getId();
        var chartMargin = view.getChartMargin() || me.defaultChartMargin;
        var chartSize = me.getChartSize();
        var translate = makeTranslate(chartMargin.left, chartMargin.top);
        var viewSize = me.getViewSize();

        // Get the container view by its ID and append the SVG including an
        // additional group element to it.
        d3.select(viewId)
            .append('svg')
                .attr('viewBox', '0 0 ' + viewSize[0] + ' ' + viewSize[1])
                .attr('width', viewSize[0])
                .attr('height', viewSize[1])
            .append('g')
                .attr('transform', translate)
            .append('rect')
                .style('fill', view.getBackgroundColor() || '#EEE')
                .attr('class', CSS.PLOT_BACKGROUND)
                .attr('width', chartSize[0])
                .attr('height', chartSize[1])
                .attr('pointer-events', 'all');
    },

    /**
     *
     */
    deleteShapeContainerSvg: function() {
        var view = this.getView();
        var svg = d3.select('#' + view.getId() + ' svg svg');
        if (svg && !svg.empty()) {
            svg.node().remove();
        }
    },

    /**
     * Draws the legend container <div>.
     */
    drawLegendContainer: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var CSS = staticMe.CSS_CLASS;
        var view = me.getView();
        var viewId = '#' + view.getId();
        var viewSize = me.getViewSize();
        var viewWidth = viewSize[0];
        var viewHeight = viewSize[1];

        var legWidth = me.legendTargetWidth;
        var legLeft = viewWidth - legWidth;
        var legHeight = viewHeight;

        d3.select(viewId)
            .append('div')
                .attr('class', CSS.LEGEND_CONTAINER)
                .style('width', legWidth + 'px')
                .style('height', legHeight + 'px')
                .style('left', legLeft + "px" )
            // values below will be updated in #updateLegendContainerDimensions
            .append('svg')
                .attr('viewBox', '0 0 ' + legWidth + ' 100')
                .attr('width', legWidth)
                .attr('height', '100');
        var legSvg = d3.select(viewId + ' .' + CSS.LEGEND_CONTAINER + ' svg');

        me.legendSvg = legSvg;
    },

    /**
     * Updates the size of the root SVG container to the current view size.
     */
    updateSvgContainerSize: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var view = me.getView();
        var viewId = '#' + view.getId();
        var chartSize = me.getChartSize();
        var makeTranslate = staticMe.makeTranslate;
        var chartMargin = view.getChartMargin() || me.defaultChartMargin;
        var translate = makeTranslate(chartMargin.left, chartMargin.top);
        var svgContainer = d3.select(viewId + ' svg');
        var svgGroup = d3.select(viewId + ' svg g');
        var svgRect = d3.select(viewId + ' svg rect');
        var viewSize = me.getViewSize();

        svgContainer
            .attr('viewBox', '0 0 ' + viewSize[0] + ' ' + viewSize[1])
            .attr('width', viewSize[0])
            .attr('height', viewSize[1]);

        svgGroup
            .attr('transform', translate);

        svgRect
            .attr('width', chartSize[0])
            .attr('height', chartSize[1]);

        // Re-register the zoom interaction if requested as the charts sizes
        // may have changed.
        if (view.getZoomEnabled()) {
            me.createInteractions();
            svgContainer.call(me.zoomInteraction);
        }
    },

    /**
     * Updates the position of the legend container <div>.
     */
    updateLegendContainerPosition: function() {
        var me = this;
        var viewSize = me.getViewSize();
        var viewWidth = viewSize[0];
        var viewHeight = viewSize[1];
        var legWidth = me.legendTargetWidth;
        var legLeft = viewWidth - legWidth;
        var legHeight = viewHeight;
        var legendNode = me.legendSvg.node();

        if (legendNode && legendNode.parentNode) {
            d3.select(legendNode.parentNode)
                .style('left', legLeft + 'px')
                .style('width', legWidth + 'px')
                .style('height', legHeight + 'px');
        }
    },

    /**
     *
     */
    createScales: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var view = me.getView();
        var chartSize = me.getChartSize();

        Ext.iterate(view.getAxes(), function(orient, axisConfig) {
            var scaleType = staticMe.SCALE[axisConfig.scale || 'linear'];
            var range;

            if (orient === 'top' || orient === 'bottom') {
                range = [0, chartSize[0]];
            } else if (orient === 'left' || orient === 'right') {
                range = [chartSize[1], 0];
            }

            me.scales[orient] = scaleType().range(range);
        });
    },

    /**
     * Method that can be adjusted to generate a custom multi scale time formatter
     * function, based on https://github.com/d3/d3-time-format
     *
     * See https://github.com/d3/d3-time-format/blob/master/README.md#locale_format
     * for available D3 datetime formats.
     *
     * @param  {Date} date The current Date object.
     * @return {function} The multi-scale time format function.
     */
    getMultiScaleTimeFormatter: function(date) {
        var formatMillisecond = d3.timeFormat(".%L"),
            formatSecond = d3.timeFormat(":%S"),
            formatMinute = d3.timeFormat("%H:%M"),
            formatHour = d3.timeFormat("%H:%M"),
            formatDay = d3.timeFormat("%a %d"),
            formatWeek = d3.timeFormat("%b %d"),
            formatMonth = d3.timeFormat("%B"),
            formatYear = d3.timeFormat("%Y");

        return (d3.timeSecond(date) < date ? formatMillisecond
          : d3.timeMinute(date) < date ? formatSecond
          : d3.timeHour(date) < date ? formatMinute
          : d3.timeDay(date) < date ? formatHour
          : d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
          : d3.timeYear(date) < date ? formatMonth
          : formatYear)(date);
    },

    /**
     * Creates the axes.
     */
    createAxes: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var view = me.getView();
        var axesConfig = view.getAxes();

        Ext.iterate(axesConfig, function(orient, axisConfig) {
            var axis = staticMe.ORIENTATION[orient];
            var scale = me.scales[orient];

            // https://github.com/d3/d3-format
            var tickFormatter;
            if (axisConfig.scale === 'time') {
                tickFormatter = me.getMultiScaleTimeFormatter;
            } else if (axisConfig.format) {
                tickFormatter = d3.format(axisConfig.format || ',.0f');
            }

            var chartAxis = axis(scale)
                .ticks(axisConfig.ticks)
                .tickValues(axisConfig.tickValues)
                .tickFormat(tickFormatter)
                .tickSize(axisConfig.tickSize || 6)
                .tickPadding(axisConfig.tickPadding || 3);

            me.axes[orient] = chartAxis;
        });
    },

    /**
     * Draws the axes.
     */
    drawAxes: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var makeTranslate = staticMe.makeTranslate;
        var CSS = staticMe.CSS_CLASS;
        var view = me.getView();
        var viewId = '#' + view.getId();
        var axesConfig = view.getAxes();
        var chartSize = me.getChartSize();

        Ext.iterate(axesConfig, function(orient, axisConfig) {
            var axisTransform;
            var labelTransform;
            var labelPadding;
            var cssAxisClass;
            var cssLabelClass;

            if (orient === 'top' || orient === 'bottom') {
                cssAxisClass = CSS.AXIS + ' ' + CSS.AXIS_X;
                cssLabelClass = CSS.AXIS_LABEL + ' ' + CSS.AXIS_LABEL_X;
                axisTransform = (orient === 'bottom') ?
                        makeTranslate(0, chartSize[1]) : undefined;

                labelTransform = makeTranslate(chartSize[0] / 2, 0);
                labelPadding = axisConfig.labelPadding || 35;
            } else if (orient === 'left' || orient === 'right') {
                cssAxisClass = CSS.AXIS + ' ' + CSS.AXIS_Y;
                cssLabelClass = CSS.AXIS_LABEL + ' ' + CSS.AXIS_LABEL_Y;
                axisTransform = (orient === 'right') ?
                        makeTranslate(chartSize[0], 0) : undefined;
                var translate = makeTranslate(chartSize[1] / -2, 0);
                labelTransform = 'rotate(-90), ' + translate;
                labelPadding = (axisConfig.labelPadding || 25) * -1;
            }

            d3.select(viewId + ' svg > g')
                .append('g')
                    .attr('class', cssAxisClass)
                    .attr('transform', axisTransform)
                    .call(me.axes[orient])
                .append('text')
                    .attr('transform', labelTransform)
                    .attr('dy', labelPadding)
                    .attr('fill', axisConfig.labelColor || '#000')
                    .attr('class', cssLabelClass)
                    .style('text-anchor', 'middle')
                    .style('font-weight', 'bold')
                    .style('font-size', axisConfig.labelSize || 12)
                    .text(axisConfig.label || '');

            if (axisConfig.rotateXAxisLabel && (orient === 'top' || orient === 'bottom')) {
                d3.selectAll(viewId + ' .' + CSS.AXIS + '.' + CSS.AXIS_X + ' > g > text')
                    .attr('transform', 'rotate(-55)')
                    .attr('dx', '-10px')
                    .attr('dy', '1px')
                    .style('text-anchor', 'end');
            }
        });
    },

    /**
     * Redraws all axes.
     */
    redrawAxes: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var makeTranslate = staticMe.makeTranslate;
        var CSS = staticMe.CSS_CLASS;
        var view = me.getView();
        var viewId = '#' + view.getId();
        var axesConfig = view.getAxes();
        var axisSelector = viewId + ' svg g.' + CSS.AXIS;
        var chartSize = me.getChartSize();

        Ext.iterate(axesConfig, function(orient) {
            var axisGenerator = me.axes[orient];
            var axisTransform;
            var labelTransform;
            var axis;

            if (orient === 'top' || orient === 'bottom') {
                axisTransform = (orient === 'bottom') ?
                        makeTranslate(0, chartSize[1]) : undefined;
                labelTransform = makeTranslate(chartSize[0] / 2, 0);

                axis = d3.select(axisSelector + '.' + CSS.AXIS_X);
            } else if (orient === 'left' || orient === 'right') {
                axisTransform = (orient === 'right') ?
                        makeTranslate(0, chartSize[1]) : undefined;
                var translate = makeTranslate(chartSize[1] / -2, 0);
                labelTransform = 'rotate(-90), ' + translate;

                axis = d3.select(axisSelector + '.' + CSS.AXIS_Y);
            }

            axis
                .transition()
                .attr('transform', axisTransform)
                .call(axisGenerator);

            // Redraw the axis label
            axis.select('.' + CSS.AXIS_LABEL)
                .transition()
                .attr('transform', labelTransform);
        });
    },

    /**
     * Creates the grid axis.
     */
    createGridAxes: function() {
        var me = this;
        var view = me.getView();
        var gridConfig = view.getGrid();

        if (!gridConfig.show) {
            return false;
        }

        var staticMe = Koala.view.component.D3BaseController;
        var chartSize = me.getChartSize();
        var orientations = ['bottom', 'left'];

        Ext.each(orientations, function(orient) {
            var axis = staticMe.ORIENTATION[orient];
            var scale = me.scales[orient];
            var tickSize;

            if (orient === 'top' || orient === 'bottom') {
                tickSize = chartSize[1];
            } else if (orient === 'left' || orient === 'right') {
                tickSize = chartSize[0] * -1;
            }

            var chartAxis = axis(scale)
                .tickFormat('')
                .tickSize(tickSize);

            me.gridAxes[orient] = chartAxis;
        });
    },

    /**
     * Redraws the grid axis.
     */
    redrawGridAxes: function() {
        var me = this;
        var view = me.getView();
        var gridConfig = view.getGrid();

        if (!gridConfig.show) {
            return false;
        }

        var staticMe = Koala.view.component.D3BaseController;
        var CSS = staticMe.CSS_CLASS;
        var viewId = '#' + view.getId();
        var axisSelector = viewId + ' svg g.' + CSS.GRID;
        var orientations = ['bottom', 'left'];

        Ext.each(orientations, function(orient) {
            var axisGenerator = me.gridAxes[orient];
            var axis;

            if (orient === 'top' || orient === 'bottom') {
                axis = d3.select(axisSelector + '.' + CSS.GRID_X);
            } else if (orient === 'left' || orient === 'right') {
                axis = d3.select(axisSelector + '.' + CSS.GRID_Y);
            }

            axis
                .transition()
                .call(axisGenerator);
        });
    },

    /**
     * Draws the axis.
     */
    drawGridAxes: function() {
        var me = this;
        var view = me.getView();
        var gridConfig = view.getGrid();

        if (!gridConfig.show) {
            return false;
        }

        var staticMe = Koala.view.component.D3BaseController;
        var CSS = staticMe.CSS_CLASS;
        var viewId = '#' + view.getId();
        var orientations = ['bottom', 'left'];

        Ext.each(orientations, function(orient) {
            var cssClass;

            if (orient === 'bottom') {
                cssClass = CSS.GRID + ' ' + CSS.GRID_X;
            } else if (orient === 'left') {
                cssClass = CSS.GRID + ' ' + CSS.GRID_Y;
            }

            d3.select(viewId + ' svg > g')
                .append('g')
                    .attr('class', cssClass)
                    .call(me.gridAxes[orient]);

            d3.selectAll(viewId + ' svg g.' + CSS.GRID + ' line')
                .style('stroke-width', gridConfig.width || 1)
                .style('stroke', gridConfig.color || '#d3d3d3')
                .style('stroke-opacity', gridConfig.opacity || 0.7);
        });
    },

    /**
     *
     */
    drawTitle: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BaseController;
        var view = me.getView();
        var viewId = '#' + view.getId();
        var titleConfig = view.getTitle();
        var chartSize = me.getChartSize();
        var translate = staticMe.makeTranslate(chartSize[0] / 2, 0);

        d3.select(viewId + ' svg > g')
            .append('text')
                .attr('transform', translate)
                .attr('dy', (titleConfig.labelPadding || 18) * -1)
                .attr('fill', titleConfig.labelColor || '#000')
                .style('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .style('font-size', titleConfig.labelSize || 20)
                .text(titleConfig.label || '');
    },

    /**
     * Redraws the chart title completely.
     */
    redrawTitle: function() {
        var me = this;

        me.deleteTitle();
        me.drawTitle();
    },

    /**
     * The legend entries for all elements is in its own svg, which itself lives
     * in a scrollable div. For the SVG to be actually scrollable, we have to
     * give it the real dimensions of all the legend element it contains. This
     * way the svg is (sometimes) bigger in height than the containg div, and
     * the browser shows the scrollbar.
     */
    updateLegendContainerDimensions: function() {
        var me = this;
        var legendParent = me.legendSvg;
        var elems = 'data' in me ? me.data : me.shapes;
        var numLegends;
        if (Ext.isArray(elems)) { // for barcharts
            numLegends = elems.length;
        } else if(Ext.isObject(elems)) { // for timeseries
            numLegends = Object.keys(elems).length;
        } else {
            // Ouch, shouldn't happen.
            numLegends = 0;
        }
        var heightEach = me.legendEntryTargetHeight;
        var legWidth = me.legendTargetWidth;
        var legHeight = heightEach + heightEach * numLegends;
        legendParent
            .attr('viewBox', "0 0 " + legWidth + " " + legHeight)
            .attr('width', legWidth)
            .attr('height', legHeight);
    },

    /**
     * Generates a callback that can be used for the click event on the delete
     * icon. Inside this callback all relevant parts of the series/bar are
     * removed by eventually calling into the concrete #deleteEverything
     * and #redrawLegend implementations of child classes
     *
     * @param {Object} shape The current shape object to handle.
     * @param {[Number]} idx The index of the shape object in the array of all
     *     shapes.
     * @return {Function} The callback to be used as click handler on the delete
     *     icon.
     */
    generateDeleteCallback: function(dataObj) {
        var me = this;
        var deleteCallback = function() {
            me.deleteEverything(dataObj);
            me.redrawLegend();
        };
        return deleteCallback;
    },

    /**
     * A placeholder method to be implemented by subclasses.
     *
     * @param {Object} dataObj The data object, either a 'bar' or a 'series'.
     */
    deleteEverything: function(dataObj) {
        Ext.log.info('deleteEverything received', dataObj);
        Ext.raise('deleteEverything must be overridden by child controllers');
    },

    /**
     * Deletes the legendentry passed from the DOM.
     *
     * @param {id} id The id of the associated series.
     */
    deleteLegendEntry: function(id) {
        var me = this;
        var CSS = Koala.view.component.D3BaseController.CSS_CLASS;
        var view = me.getView();
        var viewId = '#' + view.getId();
        var selectorTpl = '{0} g[idx="{1}{2}"]';
        var selector = Ext.String.format(
            selectorTpl,
            viewId, CSS.PREFIX_IDX_LEGEND_GROUP, id
        );
        var legendEntry = d3.select(selector).node();
        var parent = legendEntry && legendEntry.parentNode;
        if (parent) {
            parent.removeChild(legendEntry);
        }
    },

    /**
     * Removes the title of the chart.
     */
    deleteTitle: function() {
        var me = this;
        var view = me.getView();
        var viewId = '#' + view.getId();

        var titleNode = d3.select(viewId + ' svg > g > text');
        titleNode.remove();
    },

    /**
     * Toggles an SVG g element's visibility and the appropriate legend entry
     * the g ususally grouops a bar and its label or a series.
     */
    toggleGroupVisibility: function(group, legendElement) {
        var staticMe = Koala.view.component.D3BaseController;
        var CSS = staticMe.CSS_CLASS;
        var SHAPE_GROUP = CSS.SHAPE_GROUP;
        var SUFFIX_HIDDEN = CSS.SUFFIX_HIDDEN;
        var hideClsName = SHAPE_GROUP + SUFFIX_HIDDEN;
        var hideClsNameLegend = SHAPE_GROUP + CSS.SUFFIX_LEGEND + SUFFIX_HIDDEN;
        if (group) {
            var isHidden = group.classed(hideClsName);
            group.classed(hideClsName, !isHidden);
            legendElement.classed(hideClsNameLegend, !isHidden);
        }
    },

    /**
     * Removes the current legend from the chart (if it exists) and redraws the
     * legend by looking at our internal data (by calling #drawLegend).
     */
    redrawLegend: function() {
        var me = this;
        var staticMe = Koala.view.component.D3BarChartController;
        var CSS = staticMe.CSS_CLASS;
        var legendCls = CSS.SHAPE_GROUP + CSS.SUFFIX_LEGEND;
        var legend = this.legendSvg.select('g.' + legendCls);
        if (legend) {
            var legendNode = legend.node();
            legendNode.parentNode.removeChild(legendNode);
        }
        me.drawLegend();
    },

    /**
     * Toggles the legend's visibility.
     */
    toggleLegendVisibility: function() {
        var me = this;
        var view = me.getView();
        // var chart = view.down('d3-chart');
        // var chartCtrl = chart.getController();
        var chartMargin = view.getChartMargin() || me.defaultChartMargin;
        var chartMarginRight = me.legendTargetWidth;

        if (me.legendSvg && me.legendSvg.node() &&
                me.legendSvg.node().parentNode) {

            me.legendVisible = !me.legendVisible;

            var legendContainer = me.legendSvg.node().parentNode;
            d3.select(legendContainer).style('display', me.legendVisible ?
                    'unset' : 'none');

            view.setChartMargin({
                top: chartMargin.top,
                right: me.legendVisible ? chartMarginRight : 25,
                bottom: chartMargin.bottom,
                left: chartMargin.left
            });

            me.redrawChart();
        }
    }
});
