Ext.define('Koala.view.container.styler.GeoStylerController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.container.styler.geostyler',

    /**
     * Holds the delayed task since we can possibly be called while the view is
     * still being configured.
     *
     * @private
     */
    rebuildTask: null,

    /**
     * The interval in milliseconds, at which we recheck if the view is done
     * being configured.
     *
     * @private
     */
    rebuildCheckInterval: 25,

    /**
     *
     */
    reloadCurrentStyle: function() {
        var me = this;
        var viewModel = this.getViewModel();
        var layer = viewModel.get('layer');
        Ext.Msg.show({
            title: 'Info',
            message: 'Stil von <b>' + layer.get('name') +
                '</b> zurücksetzen?',
            buttonText: {
                yes: 'Ja',
                no: 'Nein'
            },
            fn: function(btnId) {
                if (btnId === 'yes') {
                    layer.setStyle(layer.get('originalStyle'));
                    layer.set('koalaStyle', undefined);
                    me.getView().up('window').close();
                }
            }
        });
    },

    /**
     *
     */
    applyAndSave: function() {
        var viewModel = this.getViewModel();
        var layer = viewModel.get('layer');
        var style = viewModel.get('style');
        layer.set('koalaStyle', style);
        var sldParser = new GeoStylerSLDParser.SldStyleParser();
        sldParser.writeStyle(style)
            .then(function(sld) {
                Koala.util.Layer.updateVectorStyle(layer, sld);
            })
            .catch(function() {
                Ext.Msg.alert(viewModel.get('saveStyle'), viewModel.get('styleNotConvertedMsg'));
            });
        var olParser = new GeoStylerOpenlayersParser.OlStyleParser(ol);
        olParser.writeStyle(style)
            .then(function(olStyle) {
                layer.setStyle(olStyle);
            })
            .catch(function() {
                Ext.Msg.alert(viewModel.get('saveStyle'), viewModel.get('styleNotConvertedMsg'));
            });
    },

    /**
     * Exports (downloads) the current style as SLD.
     */
    exportStyle: function() {
        var me = this;
        var viewModel = this.getViewModel();
        var style = viewModel.get('style');
        var fileName = style.name.replace(/,/g, '').replace(/ /g, '_');
        var win = Ext.create('Ext.window.Window', {
            title: viewModel.get('downloadStyleMsgTitle'),
            name: 'downloadstylewin',
            width: 300,
            layout: 'fit',
            bodyPadding: 10,
            items: [{
                xtype: 'container',
                items: [{
                    xtype: 'textfield',
                    name: 'filenameField',
                    width: '100%',
                    fieldLabel: viewModel.get('downloadFilenameText'),
                    labelWidth: 120,
                    value: fileName,
                    allowBlank: false,
                    minLength: 3,
                    validator: function(val) {
                        errMsg = viewModel.get('filenameNotValidText');
                        return ((val.length > 3) && (val.search(/ /) === -1)) ? true : errMsg;
                    }
                }, {
                    xtype: 'combo',
                    id: 'styleFormatCombo',
                    width: '100%',
                    fieldLabel: viewModel.get('outputFormatText'),
                    valueField: 'style',
                    displayField: 'style',
                    value: 'sld',
                    forceSelection: true,
                    store: {
                        data: [{
                                mimetype: 'application/xml',
                                style: 'sld',
                                suffix: '.xml'
                            },
                            {
                                mimetype: 'application/xml',
                                style: 'QGIS-Style',
                                suffix: '.qml'
                            },
                            {
                                mimetype: 'application/json',
                                style: 'MapBox-Style',
                                suffix: '.json'
                            }
                        ]
                    },
                    // listeners: {
                    //     'select': me.onDownloadStyleFormatSelected
                    // }
                }]
            }],
            bbar: [{
                text: viewModel.get('downloadStyleMsgButtonYes'),
                name: 'confirm-style-download',
                handler: me.downloadStyle.bind(me, style)
            }, {
                text: viewModel.get('downloadStyleMsgButtonNo'),
                name: 'abort-style-download',
                handler: function() {
                    this.up('window').close();
                }
            }]
        });
        win.show();

    },

    /** Actually do the downloads
     */
    downloadStyle: function(style) {
        var win = Ext.ComponentQuery.query('[name=downloadstylewin]');
        var viewModel = this.getViewModel();
        //var style = viewModel.get('style');
        var styleFormatCombo = Ext.ComponentQuery.query('combo[id="styleFormatCombo"]')[0];
        debugger;
        var filename = Ext.ComponentQuery.query('textfield[name=filenameField]');
        var mimetype = styleFormatCombo.getSelectedRecord().get('mimetype');
        var styleFormat = styleFormatCombo.getSelectedRecord().get('style');
        var suffix = styleFormatCombo.getSelectedRecord().get('suffix');
        console.log('DownloadStyleFormatSelected');

        if (styleFormat == 'sld'){
            var sldParser = new GeoStylerSLDParser.SldStyleParser();
            sldParser.writeStyle(style)
                .then(function(sld) {
                    var name = style.name;
                    if (!name) {
                        name = 'style.xml';
                    }
                    if (!name.endsWith('.xml')) {
                        name += '.xml';
                    }
                    var arr = new TextEncoder().encode(sld);
                    download(arr, name, 'application/xml');
                });
        } else if (styleFormat == 'QGIS-Style'){
            var QGISParser = new GeoStylerQGISParser.QGISStyleParser();
            QGISParser.writeStyle(style)
                .then(function(QGISStyle) {
                    var name = style.name;
                    if (!name) {
                        name = 'style.qml';
                    }
                    if (!name.endsWith('.qml')) {
                        name += '.qml';
                    }
                    var arr = new TextEncoder().encode(QGISStyle);
                    download(arr, name, 'application/xml');
                });
        } else if (styleFormat == 'MapBox-Style'){
            var MapboxParser = new GeoStylerMapboxParser.MapboxStyleParser({ignoreConversionErrors: true});
            MapboxParser.writeStyle(style)
                .then(function(MapboxStyle) {
                    var name = style.name;
                    if (!name) {
                        name = 'style.json';
                    }
                    if (!name.endsWith('.json')) {
                        name += '.json';
                    }
                    var arr = new TextEncoder().encode(MapboxStyle);
                    download(arr, name, 'application/json');
                });
        }

    },

    /**
     * Imports an style file and updates the styler with its content.
     */
    importStyle: function() {
        var view = this.getView();
        Ext.create('BasiGX.view.window.FileUploadWindow', {
            importHandler: function(result) {
                //toDo: check Format of loaded style
                var sldParser = new GeoStylerSLDParser.SldStyleParser();
                sldParser.readStyle(result)
                    .then(function(style) {
                        view.onStyleChange(style);
                    });
            },
            hideFakepath: true
        }).show();
    },

    /**
     * Loads a SLD from the vector-template.
     */
    chooseFromVectorTemplate: function() {
        var view = this.getView();
        var layer = view.lookupViewModel().get('layer');
        var styles = Koala.util.Object.getPathStrOr(layer,
            'metadata/layerConfig/olProperties/styleReference');
        if (!styles) {
            styles = '';
        }
        styles = styles.split(',')
            .map(function(style) {
                return style.trim();
            });
        var templateStyleLabel = view.lookupViewModel().get('templateStyleLabel');
        var okButtonLabel = view.lookupViewModel().get('okButtonLabel');
        var cancelButtonLabel = view.lookupViewModel().get('cancelButtonLabel');
        var loadSldFromGeoServer = this.loadSldFromGeoServer.bind(this);

        Ext.create('Ext.window.Window', {
            bodyPadding: 10,
            items: [{
                labelAlign: 'top',
                xtype: 'combo',
                width: 300,
                forceSelection: true,
                fieldLabel: templateStyleLabel,
                store: styles,
                value: styles[0]
            }],
            bbar: [{
                xtype: 'button',
                text: okButtonLabel,
                handler: function() {
                    var win = this.up('window');
                    var style = win.down('combo').getValue();
                    loadSldFromGeoServer(style);
                    win.close();
                }
            }, {
                xtype: 'button',
                text: cancelButtonLabel,
                handler: function() {
                    var win = this.up('window');
                    win.getCancelHandler()();
                    win.close();
                }
            }]
        }).show();
    },

    /**
     * Loads and applies a SLD from the vector-template.
     * @param {string} sldName The sldName that should be loaded.
     */
    loadSldFromGeoServer: function(sldName) {
        var view = this.getView();
        var appContext = Koala.util.AppContext.getAppContext();
        var geoserverBaseUrl = Koala.util.Object.getPathStrOr(appContext, 'data/merge/urls/geoserver-base-url');
        var url = geoserverBaseUrl + '/rest/styles/' + sldName + '.sld';
        Ext.Ajax.request({
                url: url,
                method: 'GET'
            })
            .then(function(response) {
                var sld = response.responseText;
                var sldParser = new GeoStylerSLDParser.SldStyleParser();
                sldParser.readStyle(sld)
                    .then(function(geoStylerStyle) {
                        view.onStyleChange(geoStylerStyle);
                    });
            });
    }

});
