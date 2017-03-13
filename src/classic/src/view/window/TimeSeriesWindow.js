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
 * @class Koala.view.window.TimeSeriesWindow
 */
Ext.define("Koala.view.window.TimeSeriesWindow", {
    extend: "Ext.window.Window",
    xtype: "k-window-timeserieswindow",
    cls: "k-window-timeserieswindow",

    requires: [
        "Koala.view.window.TimeSeriesWindowController",
        "Koala.view.window.TimeSeriesWindowModel",
        "Koala.util.Duration",
        "Koala.util.Date",
        "Koala.util.Filter",
        "Koala.util.String",

        "Ext.form.field.Date"
    ],

    controller: "k-window-timeserieswindow",

    viewModel: {
        type: "k-window-timeserieswindow"
    },

    bind: {
        title: '{title}'
    },

    name: 'timeserieswin',
    constrainHeader: true,
    collapsible: true,
    maxHeight: 800,
    height: 300,
    width: 900,
    layout: {
        type: 'vbox'
    },
    tools: [{
        type: 'help',
        //TODO: move to app-locale
        tooltip: 'Hilfe',
        callback: function() {
            var helpWin = Ext.ComponentQuery.query('k-window-help')[0];
            if (!helpWin) {
                helpWin = Ext.create('Koala.view.window.HelpWindow').show();
                helpWin.on('afterlayout', function() {
                    var helpWinController = this.getController();
                    helpWinController.setTopic('mapGeoObjects', 'map');
                });
            } else {
                BasiGX.util.Animate.shake(helpWin);
                var helpWinController = helpWin.getController();
                helpWinController.setTopic('mapGeoObjects', 'map');
            }
        }
    }],
    defaults: {
        flex: 1,
        width: '100%'
    },

    config: {
        addFilterForm: true
    },

    listeners: {
        show: 'onTimeseriesShow',
        close: 'onTimeseriesClose'
    },

    /**
     * The olLayer we were constructed with
     */
    initOlLayer: null,

    items: [],

    /**
     * Initializes the component.
     */
    initComponent: function() {
        var me = this;
        var FilterUtil = Koala.util.Filter;
        var metadata = me.initOlLayer.metadata;
        var timeRangeFilter = FilterUtil.getStartEndFilterFromMetadata(metadata);
        var minMaxDates = FilterUtil.getMinMaxDatesFromMetadata(metadata);

        if (me.getAddFilterForm()) {
            me.items = [{
                xtype: 'form',
                layout: {
                    type: 'hbox',
                    pack: 'center'
                },
                padding: 5,
                defaults: {
                    padding: 5
                },
                height: 40,
                maxHeight: 40,
                minHeight: 40,
                items: [{
                    // https://github.com/gportela85/DateTimeField
                    xtype: 'datefield',
                    bind: {
                        fieldLabel: '{dateFieldStartLabel}'
                    },
                    minValue: minMaxDates.min,
                    maxValue: minMaxDates.max,
                    value: timeRangeFilter.mindatetimeinstant,
                    labelWidth: 35,
                    name: 'datestart',
                    format: 'j F Y, H:i',
                    flex: 1
                }, {
                    xtype: 'datefield',
                    bind: {
                        fieldLabel: '{dateFieldEndLabel}'
                    },
                    minValue: minMaxDates.min,
                    maxValue: minMaxDates.max,
                    value: timeRangeFilter.maxdatetimeinstant,
                    labelWidth: 38,
                    name: 'dateend',
                    format: 'j F Y, H:i',
                    flex: 1
                }, {
                    xtype: 'button',
                    name: 'btn-set-filter',
                    bind: {
                        text: '{setFilterBtnText}'
                    },
                    handler: 'onSetFilterBtnClick',
                    margin: '0 3px 0 0'
                }, {
                    xtype: 'button',
                    name: 'btn-reset-filter',
                    bind: {
                        text: '{resetFilterBtnText}'
                    },
                    handler: 'onResetFilterBtnClick',
                    margin: '0 3px 0 0'
                }, {
                    xtype: 'combo',
                    displayField: 'text',
                    queryMode: 'local',
                    emptyText: 'Chart hinzufügen',
                    bind: {
                        fieldLabel: '{selectChartLayerComboLabel}'
                    },
                    listeners: {
                        select: 'onSelectChartLayerComboSelect',
                        beforerender: 'bindSelectChartLayerStore'
                    },
                    flex: 1
                }]
            }];
        }
        me.callParent();
    }
});
