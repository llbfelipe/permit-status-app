/*
 | Version 10.2
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
//Create BaseMap components

function CreateBaseMapComponent() {
    var baseMapURL = 0;
    var baseMapURLCount = 0;
    for (var i = 0; i < responseObject.BaseMapLayers.length; i++) {
        if (responseObject.BaseMapLayers[i].MapURL) {
            if (isWebMap) {
                if (i != 0) {
                    map.addLayer(CreateBaseMapLayer(responseObject.BaseMapLayers[i].MapURL, responseObject.BaseMapLayers[i].Key, (i == 0) ? false : false));
                }
            } else {
                map.addLayer(CreateBaseMapLayer(responseObject.BaseMapLayers[i].MapURL, responseObject.BaseMapLayers[i].Key, (i == 0) ? true : false));
            }
            if (baseMapURLCount == 0) {
                baseMapURL = i;
            }
            baseMapURLCount++;
        }
    }
    var layerList = dojo.byId('layerList');
    for (var i = 0; i < Math.ceil(responseObject.BaseMapLayers.length / 2); i++) {
        if (responseObject.BaseMapLayers[(i * 2) + 0] && responseObject.BaseMapLayers[(i * 2) + 0].MapURL) {
            var layerInfo = responseObject.BaseMapLayers[(i * 2) + 0];
            layerList.appendChild(CreateBaseMapElement(layerInfo));
        }
        if (responseObject.BaseMapLayers[(i * 2) + 1] && responseObject.BaseMapLayers[(i * 2) + 1].MapURL) {
            layerInfo = responseObject.BaseMapLayers[(i * 2) + 1];
            layerList.appendChild(CreateBaseMapElement(layerInfo));
        }
    }

    if (baseMapURLCount >= 1) {
        dojo['dom-class'].add(dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[baseMapURL].Key), "selectedBaseMap");
        map.getLayer(responseObject.BaseMapLayers[baseMapURL].Key).show();
    }
}

//Create BaseMap images with respective titles

function CreateBaseMapElement(baseMapLayerInfo) {
    var divContainer = document.createElement("div");
    dojo['dom-class'].add(divContainer, "baseMapContainerNode");
    var imgThumbnail = document.createElement("img");
    imgThumbnail.src = baseMapLayerInfo.ThumbnailSource;
    dojo['dom-class'].add(imgThumbnail, "basemapThumbnail");
    imgThumbnail.id = "imgThumbNail" + baseMapLayerInfo.Key;
    imgThumbnail.setAttribute("layerId", baseMapLayerInfo.Key);
    imgThumbnail.onclick = function () {
        ChangeBaseMap(this);
        ShowBaseMaps();
    };
    var spanBaseMapText = document.createElement("span");
    spanBaseMapText.id = "spanBaseMapText" + baseMapLayerInfo.Key;
    dojo['dom-class'].add(spanBaseMapText, "basemapLabel");
    spanBaseMapText.innerHTML = baseMapLayerInfo.Name;
    divContainer.appendChild(imgThumbnail);
    divContainer.appendChild(spanBaseMapText);
    return divContainer;
}

//Create BaseMap layer on the map

function CreateBaseMapLayer(layerURL, layerId, isVisible) {
    var layer = new esri.layers.ArcGISTiledMapServiceLayer(layerURL, {
        id: layerId,
        visible: isVisible
    });
    return layer;
}

//Toggle BaseMap layer

function ChangeBaseMap(spanControl) {
    HideMapLayers();
    var key = spanControl.getAttribute('layerId');

    for (var i = 0; i < responseObject.BaseMapLayers.length; i++) {
        if (responseObject.BaseMapLayers[i].MapURL) {
            dojo['dom-class'].remove(dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key), "selectedBaseMap");
            if (dojo.isIE) {
                dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key).style.marginTop = "0px";
                dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key).style.marginLeft = "0px";
                dojo.dom.byId("spanBaseMapText" + responseObject.BaseMapLayers[i].Key).style.marginTop = "0px";
            }
            if (responseObject.BaseMapLayers[i].Key == key) {
                dojo['dom-class'].add(dojo.dom.byId("imgThumbNail" + responseObject.BaseMapLayers[i].Key), "selectedBaseMap");
                if (i == 0 && isWebMap) {
                    map.addLayer(CreateBaseMapLayer(responseObject.BaseMapLayers[i].MapURL, responseObject.BaseMapLayers[i].Key, (i == 0) ? true : false));
                }
                layer = map.getLayer(responseObject.BaseMapLayers[i].Key);
                layer.show();
            }
        }
    }
}

//Hide layers

function HideMapLayers() {
    for (var i = 0; i < responseObject.BaseMapLayers.length; i++) {
        if (responseObject.BaseMapLayers[i].MapURL) {
            var layer = map.getLayer(responseObject.BaseMapLayers[i].Key);
            if (layer) {
                layer.hide();
            }
        }
    }
    if (isWebMap) {
        map.getLayer(webmapBaseMapId).hide();
    }
}

//Animate BaseMap container

function ShowBaseMaps() {
    HideShareAppContainer();
    if (!isMobileDevice) {
        HideAddressContainer();
    }
    var cellHeight = 125;
    if (dojo['dom-geometry'].getMarginBox("divLayerContainer").h > 0) {
        dojo['dom-class'].replace("divLayerContainer", "hideContainerHeight", "showContainerHeight");
        dojo.dom.byId('divLayerContainer').style.height = '0px';
    } else {
        dojo.dom.byId('divLayerContainer').style.height = cellHeight + "px";
        dojo.dom.byId('divLayerContentHolder').style.height = (cellHeight - 10) + "px";
        dojo.dom.byId('divLayerContentHolder').style.top = "0px";
        dojo['dom-class'].replace("divLayerContainer", "showContainerHeight", "hideContainerHeight");
    }
    setTimeout(function () {
        CreateScrollbar(dojo.dom.byId("divLayerContainerHolder"), dojo.dom.byId("divLayerContentHolder"));
    }, 500);
}