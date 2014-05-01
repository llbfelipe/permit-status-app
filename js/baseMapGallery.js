/*global dojo,webmapBaseMapId,esri,isMobileDevice,isWebMap,map:true,responseObject,hideShareAppContainer,hideAddressContainer,createScrollbar*/
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
 | Copyright 2013 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

//Create BaseMap layer on the map

function _createBaseMapLayer(layerURL, layerId, isVisible) {
    var layer = new esri.layers.ArcGISTiledMapServiceLayer(layerURL, {
        id: layerId,
        visible: isVisible
    });
    return layer;
}

//Hide layers

function _hideMapLayers() {
    var i, layer;
    for (i = 0; i < responseObject.BaseMapLayers.length; i++) {
        if (responseObject.BaseMapLayers[i].MapURL) {
            layer = map.getLayer(responseObject.BaseMapLayers[i].Key);
            if (layer) {
                layer.hide();
            }
        }
    }
    if (isWebMap) {
        map.getLayer(webmapBaseMapId).hide();
    }
}

//Toggle BaseMap layer

function _changeBaseMap(spanControl) {
    var i, key, layer;
    _hideMapLayers();
    key = spanControl.getAttribute('layerId');
    for (i = 0; i < responseObject.BaseMapLayers.length; i++) {
        if (responseObject.BaseMapLayers[i].MapURL) {
            dojo['dom-class'].remove(dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key), "selectedBaseMap");
            if (dojo.isIE) {
                dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key).style.marginTop = "0px";
                dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key).style.marginLeft = "0px";
                dojo.dom.byId("spanBaseMapText" + responseObject.BaseMapLayers[i].Key).style.marginTop = "0px";
            }
            if (responseObject.BaseMapLayers[i].Key === key) {
                dojo['dom-class'].add(dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key), "selectedBaseMap");
                if (i === 0 && isWebMap) {
                    map.addLayer(_createBaseMapLayer(responseObject.BaseMapLayers[i].MapURL, responseObject.BaseMapLayers[i].Key, (i === 0) ? true : false), 0);
                }
                layer = map.getLayer(responseObject.BaseMapLayers[i].Key);
                layer.show();
            }
        }
    }
}

//Animate BaseMap container

function showBaseMaps() {
    var cellHeight = 130;
    hideShareAppContainer();
    if (!isMobileDevice) {
        hideAddressContainer();
    }
    if (dojo['dom-geometry'].getMarginBox("divLayerContainer").h > 0) {
        dojo['dom-class'].replace("divLayerContainer", "hideContainerHeight", "showContainerHeight");
        dojo.dom.byId('divLayerContainer').style.height = '0px';
    } else {
        dojo.dom.byId('divLayerContainer').style.height = cellHeight + "px";
        dojo.dom.byId('divLayerContentHolder').style.height = (cellHeight - 30) + "px";
        dojo.dom.byId('divLayerContentHolder').style.top = "12px";
        dojo['dom-class'].replace("divLayerContainer", "showContainerHeight", "hideContainerHeight");
    }
    setTimeout(function () {
        createScrollbar(dojo.dom.byId("divLayerContainerHolder"), dojo.dom.byId("divLayerContentHolder"));
    }, 500);
}

//Create BaseMap images with respective titles

function _createBaseMapElement(baseMapLayerInfo) {
    var divContainer, imgThumbnail, spanBaseMapText;
    divContainer = document.createElement("div");
    dojo['dom-class'].add(divContainer, "baseMapContainerNode");
    imgThumbnail = document.createElement("img");
    imgThumbnail.src = baseMapLayerInfo.ThumbnailSource;
    dojo['dom-class'].add(imgThumbnail, "basemapThumbnail");
    imgThumbnail.id = "imgThumbNail" + baseMapLayerInfo.Key;
    imgThumbnail.setAttribute("layerId", baseMapLayerInfo.Key);
    imgThumbnail.onclick = function () {
        _changeBaseMap(this);
        showBaseMaps();
    };
    spanBaseMapText = document.createElement("span");
    spanBaseMapText.id = "spanBaseMapText" + baseMapLayerInfo.Key;
    dojo['dom-class'].add(spanBaseMapText, "basemapLabel");
    spanBaseMapText.innerHTML = baseMapLayerInfo.Name;
    divContainer.appendChild(imgThumbnail);
    divContainer.appendChild(spanBaseMapText);
    return divContainer;
}

//Create BaseMap components

function createBaseMapComponent() {
    var i, baseMapURL, baseMapURLCount, layerList, layerInfo, isVisible = false;
    baseMapURL = 0;
    baseMapURLCount = 0;
    for (i = 0; i < responseObject.BaseMapLayers.length; i++) {
        if (responseObject.BaseMapLayers[i].MapURL) {
            if (isWebMap) {
                if (i !== 0) {
                    isVisible = false;
                    map.addLayer(_createBaseMapLayer(responseObject.BaseMapLayers[i].MapURL, responseObject.BaseMapLayers[i].Key, isVisible), 0);
                }
            } else {
                if (i === 0) { isVisible = true; } else { isVisible = false; }
                map.addLayer(_createBaseMapLayer(responseObject.BaseMapLayers[i].MapURL, responseObject.BaseMapLayers[i].Key, isVisible));
            }
            if (baseMapURLCount === 0) {
                baseMapURL = i;
            }
            baseMapURLCount++;
        }
    }
    layerList = dojo.byId('layerList');
    for (i = 0; i < Math.ceil(responseObject.BaseMapLayers.length / 2); i++) {
        if (responseObject.BaseMapLayers[(i * 2)] && responseObject.BaseMapLayers[(i * 2)].MapURL) {
            layerInfo = responseObject.BaseMapLayers[(i * 2)];
            layerList.appendChild(_createBaseMapElement(layerInfo));
        }
        if (responseObject.BaseMapLayers[(i * 2) + 1] && responseObject.BaseMapLayers[(i * 2) + 1].MapURL) {
            layerInfo = responseObject.BaseMapLayers[(i * 2) + 1];
            layerList.appendChild(_createBaseMapElement(layerInfo));
        }
    }

    if (baseMapURLCount >= 1) {
        dojo['dom-class'].add(dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[baseMapURL].Key), "selectedBaseMap");
        map.getLayer(responseObject.BaseMapLayers[baseMapURL].Key).show();
    }
}
