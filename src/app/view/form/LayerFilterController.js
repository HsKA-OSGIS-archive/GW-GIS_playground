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
 * @class Koala.view.form.LayerFilterController
 */
Ext.define('Koala.view.form.LayerFilterController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.k-form-layerfilter',

    requires: [
        'Koala.util.Date',
        'Koala.util.Layer'
    ],

    /**
     * This is the actual handler when the 'Add to map' button is clicked. It
     * will create a layer (via Koala.util.Layer#layerFromMetadata) with the
     * currently displayed filters applied and add that layer to the map (via
     * Koala.util.Layer#addOlLayerToMap)
     */
    submitFilter: function(){
        var me = this;
        var LayerUtil = Koala.util.Layer;
        var view = me.getView();
        var metadata = view.getMetadata();
        var filters = view.getFilters();

        // Iterate over all filters…
        Ext.each(filters, function(filter, idx) {
            // … grab the associated fieldset by attribute
            var selector = "[filterIdx='" + idx +"']";
            var fieldset = view.down(selector);
            if (fieldset) {
                var fields = fieldset.query('field, multiselect');
                var keyVals = {};
                Ext.each(fields, function(field) {
                    var key = field.getName();
                    if (!Ext.Array.contains(view.ignoreFields, key)) {
                        var val = field.getValue();
                        if (Ext.isDate(val)) {
                            val = me.adjustToUtcIfNeeded(val);
                        }
                        keyVals[key] = val;
                    }
                });
                filters = me.updateFilterValues(filters, idx, keyVals);
            }
        });
        metadata.filters = filters;
        var layer = LayerUtil.layerFromMetadata(metadata);
        LayerUtil.addOlLayerToMap(layer);
        me.deselectThemeTreeItems();
        view.up('window').close();
    },

    /**
     * Unselects all items after a layer was added to the map.
     */
    deselectThemeTreeItems: function() {
        var tree = Ext.ComponentQuery.query('k-panel-themetree')[0];
        var treeSelModel = tree && tree.getSelectionModel();
        var selection = treeSelModel && treeSelModel.getSelection();
        if (!Ext.isEmpty(selection)) {
            treeSelModel.deselectAll();
        }
    },

    /**
     * Check if the application currently displays local dates, and if so adjust
     * the passed date to UTC since we always store in UTC.
     *
     * @param {Date} userDate A date entered in a filter which may be in local
     *     time.
     * @return {Date} The date which probably has been adjusted to UTC.
     */
    adjustToUtcIfNeeded: function(userDate){
        if (Koala.Application.isLocal()) {
            return Koala.util.Date.makeUtc(userDate);
        }
        // already UTC
        return userDate;
    },

    /**
     *
     */
    updateFilterValues: function(filters, idx, keyVals) {
        var view = this.getView();
        var filter = filters[idx];
        var filterType = (filter.type || "").toLowerCase();
        var param = filter.param;
        if (filterType === 'timerange') {
            var keys = view.self.startAndEndFieldnamesFromMetadataParam(param);
            filter.mindatetimeinstant = keyVals[keys.startName];
            filter.maxdatetimeinstant = keyVals[keys.endName];
        } else if (filterType === 'pointintime') {
            filter.timeinstant = keyVals[param];
        } else if (filterType === 'value') {
            filter.value = keyVals[param];
        }
        filters[idx] = filter;
        return filters;
    },

    /**
     * Called whenever any UTC button is toggled, this method will adjust the
     * visually relevant (displayed or restricting the calendar) dates to the
     * now active setting; either they wil be transformed to UTC or to the local
     * timezone.
     */
    handleTimereferenceButtonToggled: function(){
        var layerFilterView = this.getView();
        var dateUtil = Koala.util.Date;
        var makeUtc = dateUtil.makeUtc;
        var makeLocal = dateUtil.makeLocal;
        var dateFields = layerFilterView.query('datefield');

        var switchToUtc = Koala.Application.isUtc();
        var converterMethod = switchToUtc ? makeUtc : makeLocal;

        Ext.each(dateFields, function(dateField) {
            // The actual value of the field
            var currentDate = dateField.getValue();
            if (!currentDate) {
                return;
            }
            // Also update the minimum and maximums, as they need to be in sync
            // wrt the UTC/local setting.
            var currentMinValue = dateField.minValue; // no getter in ExtJS
            var currentMaxValue = dateField.maxValue; // no getter in ExtJS

            var accompanyingHourSpinner = dateField.up().down(
                // All that end with the string 'hourspinner', will capture all
                // spinners including those from timerange-filters
                'field[name$="hourspinner"]'
            );

            // The new value of the field
            var newDate;
            var newMinValue = currentMinValue; // to gracefully handle unset min
            var newMaxValue = currentMaxValue; // to gracefully handle unset max

            // Use the determined converter now to change new dates
            newDate = converterMethod(currentDate);
            if (!Ext.isEmpty(currentMinValue)) {
                newMinValue = converterMethod(currentMinValue);
            }
            if (!Ext.isEmpty(currentMaxValue)) {
                newMaxValue = converterMethod(currentMaxValue);
            }

            // Update spinner if any
            if (accompanyingHourSpinner) {
                accompanyingHourSpinner.setValue(newDate.getHours());
            }

            // Actually set the new values for relevant properties
            dateField.setValue(newDate);
            dateField.setMinValue(newMinValue);
            dateField.setMaxValue(newMaxValue);
        });
    },

    /**
     * Bound as handler for the beforerender event, this method registers the
     * listener to react on any UTC-button changes (See also the atual
     * method #handleTimereferenceButtonToggled).
     */
    onBeforeRenderLayerFilterForm: function(){
        var me = this;
        var utcBtns = Ext.ComponentQuery.query('k-button-timereference');
        Ext.each(utcBtns, function(utcBtn) {
            utcBtn.on('toggle', me.handleTimereferenceButtonToggled, me);
        });
    },

    /**
     * Bound as handler in the destroy sequence, this method unregisters the
     * listener to react on any UTC-button changes (See also the atual
     * method #handleTimereferenceButtonToggled).
     */
    onBeforeDestroyLayerFilterForm: function(){
        var me = this;
        var utcBtns = Ext.ComponentQuery.query('k-button-timereference');
        Ext.each(utcBtns, function(utcBtn) {
            utcBtn.un('toggle', me.handleTimereferenceButtonToggled, me);
        });
    }
});
