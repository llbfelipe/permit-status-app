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
var isAddressSearched;
var permitLayerCounter = 0;
var queryExecutedCount = 0;
var permitArray = [];
var countyGeometry;
var isPermitNumberSearched = false;

//Locate address

function ValidateLocateType() {
    if (Trim(dojo.dom.byId("tdSearchAddress").className) == "tdSearchByAddress") {
        dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
        RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
        if (Trim(dojo.dom.byId("txtAddress").value) == '') {
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
            RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            if (dojo.dom.byId("txtAddress").value != "") {
                alert(messages.getElementsByTagName("addressToLocate")[0].childNodes[0].nodeValue);
            }
            return;
        } else {
            isAddressSearched = true;
            SearchLocation();
        }
    }
    if (dojo.dom.byId("tdSearchLocation").className == "tdSearchByLocation") {
        if ((Trim(dojo.dom.byId('txtAddress').value) == '')) {
            if ((dojo.dom.byId("divBreadCrumbs").style.display == "none")) {
                dojo.dom.byId("imgSearchLoader").style.display = "none";
                dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
                RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
                if (dojo.dom.byId("txtAddress").value != "") {
                    alert(messages.getElementsByTagName("countyToLocate")[0].childNodes[0].nodeValue);
                }
                return;
            } else {
                var lastNode;
                dojo._base.array.forEach(dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")), function (node) {
                    lastNode = node;
                });
                selectedMapPoint = null;
                map.infoWindow.hide();
                var countyGeometry = new esri.geometry.Extent(parseFloat(lastNode.getAttribute("countyExtentxmin")), parseFloat(lastNode.getAttribute("countyExtentymin")), parseFloat(lastNode.getAttribute("countyExtentxmax")), parseFloat(lastNode.getAttribute("countyExtentymax")), map.spatialReference);
                ShowLocatedCountyOnMap(countyGeometry, null);
            }
        } else if (countyLayerData) {
            if (countyLayerData.UseGeocoderService) {
                isAddressSearched = false;
                SearchLocation();
            } else {
                isAddressSearched = false;
                LocateCounty();
            }
        } else {
            isAddressSearched = false;
            SearchLocation();
        }
    } else if (dojo.byId("tdSearchPermit").className == "tdSearchByPermit") {
        if (Trim(dojo.dom.byId('txtAddress').value) == '') {
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
            RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            if (dojo.dom.byId("txtAddress").value != "") {
                alert(messages.getElementsByTagName("permitToLocate")[0].childNodes[0].nodeValue);
            }
            return;
        } else {
            isAddressSearched = false;
            if (!isPermitNumberSearched) {
                isPermitNumberSearched = true;
                LocatePermitNumber();
            }
        }
    }
}

//Fetch the extent to be queried for address/location search

function SearchLocation() {
    permitArray = [];
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    ShowTransparentContainer();
    thisSearchTime = lastSearchTime = (new Date()).getTime();

    if (!isAddressSearched) {
        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", dojo.dom.byId('txtAddress').value);
    } else {
        dojo.dom.byId('txtAddress').setAttribute("defaultAddress", dojo.dom.byId('txtAddress').value);
    }
    SetAddressResultsHeight();
    var locator = new esri.tasks.Locator(responseObject.LocatorSettings.Locators[0].LocatorURL);
    locator.outSpatialReference = map.spatialReference;

    var searchExtent;
    if (!isAddressSearched) {
        if (!countyGeometry) {
            if (isWebMap) {
                searchExtent = map.getLayer(baseMapId).fullExtent;
            } else {
                for (bMap = 0; bMap < responseObject.BaseMapLayers.length; bMap++) {
                    if (responseObject.BaseMapLayers[bMap].MapURL) {
                        if (map.getLayer(responseObject.BaseMapLayers[bMap].Key).visible) {
                            searchExtent = map.getLayer(responseObject.BaseMapLayers[bMap].Key).fullExtent;
                        }
                    }
                }
            }
        } else {
            searchExtent = countyGeometry;
        }
    } else {
        if (isWebMap) {
            searchExtent = map.getLayer(baseMapId).fullExtent;
        } else {
            for (bMap = 0; bMap < responseObject.BaseMapLayers.length; bMap++) {
                if (responseObject.BaseMapLayers[bMap].MapURL) {
                    if (map.getLayer(responseObject.BaseMapLayers[bMap].Key).visible) {
                        searchExtent = map.getLayer(responseObject.BaseMapLayers[bMap].Key).fullExtent;
                    }
                }
            }
        }
    }
    GetLocation(searchExtent);
}

//Get candidate results for searched address/location

function GetLocation(searchExtent) {
    var params = {};
    params["f"] = "json";
    params[responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchField] = dojo.dom.byId('txtAddress').value;
    params[responseObject.LocatorSettings.Locators[0].LocatorParameters.SpatialReferenceField] = ((map.spatialReference.wkid) ? ("{wkid:" + map.spatialReference.wkid + "}") : ("{wkt:" + map.spatialReference.wkt + "}"));
    params[responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchResultField] = responseObject.LocatorSettings.Locators[0].CandidateFields;
    params[responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchCountField] = responseObject.LocatorSettings.Locators[0].MaxResults;
    params[responseObject.LocatorSettings.Locators[0].LocatorParameters.SearchBoundaryField] = dojo.toJson(searchExtent);
    esri.request({
        url: responseObject.LocatorSettings.Locators[0].LocatorURL,
        content: params,
        callbackParamName: "callback",
        load: function (candidates) {
            // Discard searches made obsolete by new typing from user
            if (thisSearchTime < lastSearchTime) {
                return;
            }
            if (candidates.locations.length > 0) {
                if (searchExtent.xmin.toFixed(2) == candidates.locations[0].extent.xmin.toFixed(2) && searchExtent.xmax.toFixed(2) == candidates.locations[0].extent.xmax.toFixed(2) && searchExtent.ymin.toFixed(2) == candidates.locations[0].extent.ymin.toFixed(2) && searchExtent.ymax.toFixed(2) == candidates.locations[0].extent.ymax.toFixed(2)) {
                    LocatorErrBack();
                } else {
                    ShowLocation(candidates.locations);
                }
            } else {
                LocatorErrBack();
            }
        },
        error: function (err) {
            dojo.dom.byId("imgSearchLoader").style.display = "none";
            HideTransparentContainer();
            LocatorErrBack(err.message);
            HideProgressIndicator();
        }
    });
}

//Populate candidate address list in address container

function ShowLocation(candidates) {
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    var fieldValues = isAddressSearched ? responseObject.LocatorSettings.Locators[0].AddressSearch.FieldValues : responseObject.LocatorSettings.Locators[0].LocationSearch.FieldValues;
    var fieldName = isAddressSearched ? responseObject.LocatorSettings.Locators[0].AddressSearch.FieldName : responseObject.LocatorSettings.Locators[0].LocationSearch.FieldName;
    if (candidates.length > 0) {
        if (dojo.dom.byId("txtAddress").value != "") {
            var table = dojo.dom.byId("tblAddressResults");
            var tBody = document.createElement("tbody");
            table.appendChild(tBody);
            table.cellSpacing = 0;
            table.cellPadding = 0;
            var candidatesLength = false;
            for (var i = 0; i < candidates.length; i++) {
                var candidate = candidates[i];
                for (j = 0; j < fieldValues.length; j++) {
                    if ((candidate.feature.attributes[fieldName].toUpperCase() == fieldValues[j].toUpperCase()) && (candidate.feature.attributes[responseObject.LocatorSettings.Locators[0].AddressMatchScore.Field] > responseObject.LocatorSettings.Locators[0].AddressMatchScore.Value)) {
                        var tr = document.createElement("tr");
                        tBody.appendChild(tr);
                        var tdCandidate = document.createElement("td");
                        tdCandidate.innerHTML = dojo.string.substitute(responseObject.LocatorSettings.Locators[0].DisplayField, candidate.feature.attributes);
                        tdCandidate.align = "left";
                        tdCandidate.className = 'bottomBorder';
                        tdCandidate.style.cursor = "pointer";
                        tdCandidate.setAttribute("x", candidate.feature.geometry.x);
                        tdCandidate.setAttribute("y", candidate.feature.geometry.y);
                        tdCandidate.setAttribute("countyExtentxmin", candidates[i].extent.xmin);
                        tdCandidate.setAttribute("countyExtentymin", candidates[i].extent.ymin);
                        tdCandidate.setAttribute("countyExtentxmax", candidates[i].extent.xmax);
                        tdCandidate.setAttribute("countyExtentymax", candidates[i].extent.ymax);
                        tdCandidate.onclick = function () {
                            if (!isMobileDevice) {
                                map.infoWindow.hide();
                            }
                            mapPoint = new esri.geometry.Point(this.getAttribute("x"), this.getAttribute("y"), map.spatialReference);
                            if (!isAddressSearched) {
                                countyExtent = new esri.geometry.Extent(parseFloat(this.getAttribute("countyExtentxmin")), parseFloat(this.getAttribute("countyExtentymin")), parseFloat(this.getAttribute("countyExtentxmax")), parseFloat(this.getAttribute("countyExtentymax")), map.spatialReference);
                                dojo.dom.byId("txtAddress").value = "";
                                dojo.dom.byId('txtAddress').setAttribute("defaultLocation", "");
                                ShowLocatedCountyOnMap(countyExtent, this.innerHTML);
                            } else {
                                dojo.dom.byId("txtAddress").value = this.innerHTML;
                                dojo.dom.byId('txtAddress').setAttribute("defaultAddress", this.innerHTML);
                                LocateAddressOnMap(mapPoint);
                            }
                            SetAddressResultsHeight();
                        };
                        tr.appendChild(tdCandidate);
                        candidatesLength = true;
                    }
                }
                dojo.dom.byId("imgSearchLoader").style.display = "none";
                HideTransparentContainer();
            }
            if (!candidatesLength) {
                LocatorErrBack();
            }
            SetAddressResultsHeight();
        }
    } else {
        LocatorErrBack();
    }
}

//Locate searched address on map with pushpin graphic

function LocateAddressOnMap(mapPoint) {
    ShowProgressIndicator();
    selectedMapPoint = null;
    featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = point = null;
    map.infoWindow.hide();
    ClearGraphics(tempGraphicsLayerId);
    if (isWebMap) {
        var bmap = baseMapId;
    } else {
        for (var bMap = 0; bMap < responseObject.BaseMapLayers.length; bMap++) {
            if (responseObject.BaseMapLayers[bMap].MapURL) {
                if (map.getLayer(responseObject.BaseMapLayers[bMap].Key).visible) {
                    var bmap = responseObject.BaseMapLayers[bMap].Key;
                }
            }
        }
    }
    if (!map.getLayer(bmap).fullExtent.contains(mapPoint)) {
        map.infoWindow.hide();
        mapPoint = selectedMapPoint = null;
        map.getLayer(tempGraphicsLayerId).clear();
        HideProgressIndicator();
        alert(messages.getElementsByTagName("noDataAvlbl")[0].childNodes[0].nodeValue);
        return;
    }
    if (mapPoint) {
        map.setLevel(responseObject.ZoomLevel);
        map.centerAt(mapPoint);
        var locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(responseObject.LocatorSettings.DefaultLocatorSymbol, responseObject.LocatorSettings.MarkupSymbolSize.width, responseObject.LocatorSettings.MarkupSymbolSize.height);
        var graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
            "Locator": true
        }, null);
        map.getLayer(tempGraphicsLayerId).add(graphic);
        HideProgressIndicator();
    }
    HideAddressContainer();
}

//Get candidate results for searched county

function LocateCounty() {
    var thisSearchTime = lastSearchTime = (new Date()).getTime();
    mapPoint = null;
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    ShowTransparentContainer();
    SetAddressResultsHeight();

    var queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
    var query = new esri.tasks.Query();
    query.where = dojo.string.substitute(countyLayerData.SearchExpression, [Trim(dojo.dom.byId("txtAddress").value).toUpperCase()]);
    if (isCountySearched) {
        query.geometry = countyGeometry;
        query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_WITHIN;
    }
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = false;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        if (thisSearchTime < lastSearchTime) {
            return;
        }
        if (featureSet.features.length > 0) {
            FetchCountyResults(featureSet.features);
        } else {
            dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
            RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
            LocatorErrBack();
        }
    }, function (err) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        HideTransparentContainer();
    });
}

//Get candidate results for searched permit

function LocatePermitNumber() {
    dojo.dom.byId('txtAddress').setAttribute("defaultPermit", dojo.dom.byId("txtAddress").value);
    lastSearchString = Trim(dojo.dom.byId("txtAddress").value);
    isCountySearched = false;
    permitArray = [];
    mapPoint = null;
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    SetAddressResultsHeight();
    for (index = 0; index < searchSettings.length; index++) {
        FetchPermitResults(searchSettings[index], null, index);
    }
}

//Query a layer to fetch permit data

function FetchPermitResults(layer, polygonGeometry, index) {
    permitArray = [];
    dojo.dom.byId("imgSearchLoader").style.display = "block";
    ShowTransparentContainer();
    var queryTask = new esri.tasks.QueryTask(layer.QueryLayerId);
    var query = new esri.tasks.Query();
    if (!isCountySearched) {
        query.where = dojo.string.substitute(layer.SearchExpression, [Trim(dojo.dom.byId("txtAddress").value).toUpperCase()]);
    } else {
        query.geometry = polygonGeometry;
        query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
    }
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = false;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        PopulatePermitData(featureSet, layer, index);
    }, function (err) {
        alert(dojo.string.substitute(messages.getElementsByTagName("dataNotFound")[0].childNodes[0].nodeValue, [layer.Title]));
        PopulatePermitData();
    });
}

//Fetch permit data and store it in an array

function PopulatePermitData(featureSet, layer, index) {
    queryExecutedCount++;
    var thisSearchTime = lastSearchTime = (new Date()).getTime();
    if (thisSearchTime < lastSearchTime) {
        return;
    }
    if (featureSet) {
        if (featureSet.features.length > 0) {
            for (var num in featureSet.features) {
                for (var j in featureSet.features[num].attributes) {
                    if (!featureSet.features[num].attributes[j]) {
                        featureSet.features[num].attributes[j] = responseObject.ShowNullValueAs;
                    }
                }
                permitArray.push({
                    attr: featureSet.features[num],
                    fields: featureSet.fields,
                    index: index,
                    layerID: layer
                });
            }
        }
    }
    if (searchSettings.length == queryExecutedCount) {
        if (permitArray.length > 0) {
            queryExecutedCount = 0;
            PopulatePermits(permitArray);
        } else {
            queryExecutedCount = 0;
            LocatorErrBack(messages.getElementsByTagName("noPermitFound")[0].childNodes[0].nodeValue);
            HideProgressIndicator();
        }
        dojo.dom.byId("imgSearchLoader").style.display = "none";
        isPermitNumberSearched = false;
    }

}

//Populate candidate permit list in address container

function PopulatePermits(permitArray) {
    dojo['dom-construct'].empty(dojo.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    var table = dojo.dom.byId("tblAddressResults");
    var tBody = document.createElement("tbody");
    table.appendChild(tBody);
    table.cellSpacing = table.cellPadding = 0;

    var arrPermits = [];
    try {
        for (var i = 0; i < permitArray.length; i++) {
            arrPermits.push({
                attributes: permitArray[i],
                searchDisplayField: permitArray[i].layerID.SearchDisplayFields,
                name: dojo.string.substitute(permitArray[i].layerID.SearchDisplayFields, permitArray[i].attr.attributes)
            });
        }
    } catch (e) {
        alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
    }

    arrPermits.sort(function (a, b) {
        var nameA = a.name.toLowerCase(),
            nameB = b.name.toLowerCase()
        if (nameA < nameB) //sort string ascending
            return -1
        else return 1
    });

    for (var i = 0; i < arrPermits.length; i++) {
        var tr = document.createElement("tr");
        tBody.appendChild(tr);
        var td1 = document.createElement("td");
        td1.innerHTML = arrPermits[i].name;
        td1.align = "left";
        td1.className = 'bottomBorder';
        td1.style.cursor = "pointer";
        td1.setAttribute("index", i);
        var defaultPermit = arrPermits[i].attributes.attr.attributes[arrPermits[i].searchDisplayField.split("$")[1].split("{")[1].split("}")[0]];
        td1.setAttribute("defaultPermit", defaultPermit);
        td1.onclick = function () {
            FetchPermitData(this, arrPermits);
        };
        tr.appendChild(td1);
    }
    SetAddressResultsHeight();
}

//Fetch data for the selected permit

function FetchPermitData(pThis, arrPermits) {
    ShowProgressIndicator();
    map.infoWindow.hide();
    if (!isCountySearched) {
        dojo.dom.byId("txtAddress").value = pThis.getAttribute("defaultPermit");
        dojo.dom.byId('txtAddress').setAttribute("defaultPermit", pThis.getAttribute("defaultPermit"));
    } else {
        dojo.dom.byId("txtAddress").value = "";
        dojo.dom.byId('txtAddress').setAttribute("defaultLocation", "");
    }
    lastSearchString = Trim(dojo.dom.byId("txtAddress").value);
    for (var i = 0; i < arrPermits[pThis.getAttribute("index")].attributes.fields.length; i++) {
        if (arrPermits[pThis.getAttribute("index")].attributes.fields[i].type == "esriFieldTypeOID") {
            var objID = arrPermits[pThis.getAttribute("index")].attributes.fields[i].name;
            break;
        }
    }
    searchFeatureID = arrPermits[pThis.getAttribute("index")].attributes.attr.attributes[objID];
    searchInfoWindowLayerID = searchSettings[arrPermits[pThis.getAttribute("index")].attributes.index].Title;
    addressSearchFlag = true;

    var queryTask = new esri.tasks.QueryTask(arrPermits[pThis.getAttribute("index")].attributes.layerID.QueryLayerId);
    var query = new esri.tasks.Query();
    query.where = objID + "='" + searchFeatureID + "'";
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        LocatePermitOnMap(featureSet.features[0].geometry, featureSet.features[0].attributes, arrPermits[pThis.getAttribute("index")].attributes.index, featureSet.fields);
    });
}

//Populate candidate county list in address container

function FetchCountyResults(featureset) {
    var thisSearchTime = lastSearchTime = (new Date()).getTime();
    if (thisSearchTime < lastSearchTime) {
        return;
    }
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    if (featureset.length > 0) {
        if (dojo.byId("txtAddress").value != "") {
            var table = dojo.byId("tblAddressResults");
            var tBody = document.createElement("tbody");
            table.appendChild(tBody);
            table.cellSpacing = 0;
            table.cellPadding = 0;
            var featureSet = [];
            try {
                for (var i = 0; i < featureset.length; i++) {
                    featureSet.push({
                        attributes: featureset[i].attributes,
                        name: dojo.string.substitute(countyLayerData.CountyDisplayField, featureset[i].attributes)
                    });
                }
            } catch (e) {
                alert(messages.getElementsByTagName("falseConfigParams")[0].childNodes[0].nodeValue);
            }

            featureSet.sort(function (a, b) {
                var nameA = a.name.toLowerCase(),
                    nameB = b.name.toLowerCase()
                if (nameA < nameB) //sort string ascending
                    return -1
                else return 1
            });

            for (var i = 0; i < featureSet.length; i++) {
                var tr = document.createElement("tr");
                tBody.appendChild(tr);
                var td1 = document.createElement("td");
                td1.innerHTML = dojo.string.substitute(countyLayerData.CountyDisplayField, featureSet[i].attributes);
                td1.align = "left";
                td1.className = 'bottomBorder';
                td1.style.cursor = "pointer";
                td1.setAttribute("index", i);
                td1.onclick = function () {
                    map.infoWindow.hide();
                    dojo.dom.byId("txtAddress").value = this.innerHTML;
                    dojo.dom.byId('txtAddress').setAttribute("defaultLocation", this.innerHTML);
                    lastSearchString = Trim(dojo.dom.byId("txtAddress").value);
                    var attr = featureSet[this.getAttribute("index")].attributes;
                    LocateCountyOnMap(attr);
                }
                tr.appendChild(td1);
            }
            isCountySearched = false;
            SetAddressResultsHeight();
        }
    } else {
        LocatorErrBack();
    }
}

//Display error message when locator service fails or does not return any data

function LocatorErrBack(errorMessage) {
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    var table = dojo.dom.byId("tblAddressResults");
    var tBody = document.createElement("tbody");
    table.appendChild(tBody);
    table.cellSpacing = 0;
    table.cellPadding = 0;
    var tr = document.createElement("tr");
    tBody.appendChild(tr);
    var td = document.createElement("td");
    td.innerHTML = errorMessage ? errorMessage : messages.getElementsByTagName("invalidSearch")[0].childNodes[0].nodeValue;
    td.align = "left";
    td.className = 'bottomBorder';
    td.style.cursor = "default";
    tr.appendChild(td);
}

//Query the selected county to fetch the geometry

function LocateCountyOnMap(attributes) {
    isCountySearched = true;
    permitArray = [];
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    var queryTask = new esri.tasks.QueryTask(countyLayerData.ServiceURL);
    var query = new esri.tasks.Query();
    var countyName = countyLayerData.SearchExpression.split(" LIKE")[0];
    query.where = dojo.string.substitute(countyLayerData.SearchExpression, [attributes[countyName]]);
    query.outSpatialReference = map.spatialReference;
    query.returnGeometry = true;
    query.outFields = ["*"];
    queryTask.execute(query, function (featureSet) {
        dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
        ShowLocatedCountyOnMap(featureSet.features[0].geometry, attributes[countyName]);
    });
}

//Locate searched county on map and add it to the breadcrumbs

function ShowLocatedCountyOnMap(geometry, locationName) {
    if (!isMobileDevice) {
        ShowProgressIndicator();
    } else {
        dojo.dom.byId("imgSearchLoader").style.display = "block";
        ShowTransparentContainer();
    }
    isCountySearched = true;

    if (geometry) {
        countyGeometry = geometry.getExtent();
        map.setExtent(countyGeometry);
        HideProgressIndicator();
    }
    for (var index = 0; index < searchSettings.length; index++) {
        FetchPermitResults(searchSettings[index], countyGeometry, index);
    }
    if (locationName) {
        dojo.dom.byId("divBreadCrumbs").style.display = "block";
        span = document.createElement("span");
        dojo.dom.byId("tdBreadCrumbs").appendChild(span);
        span.setAttribute("countyExtentxmin", countyGeometry.xmin);
        span.setAttribute("countyExtentymin", countyGeometry.ymin);
        span.setAttribute("countyExtentxmax", countyGeometry.xmax);
        span.setAttribute("countyExtentymax", countyGeometry.ymax);
        span.setAttribute("locationName", locationName);
        if (dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")).length > 0) {
            span.className = "spanBreadCrumbs";
            span.setAttribute("index", dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")).indexOf(span));
            span.innerHTML = " > " + locationName.split(",")[0];
        } else {
            span.className = "spanBreadCrumbs";
            span.innerHTML = locationName.split(",")[0];
            span.setAttribute("index", dojo.query(".spanBreadCrumbs", dojo.dom.byId("tdBreadCrumbs")).indexOf(span));
            SetAddressResultsHeight();
        }
        span.onclick = function () {
            NavigateBreadCrumbs(this);
        };
    }
}

function NavigateBreadCrumbs(pThis) {
    countyGeometry = new esri.geometry.Extent(parseFloat(pThis.getAttribute("countyExtentxmin")), parseFloat(pThis.getAttribute("countyExtentymin")), parseFloat(pThis.getAttribute("countyExtentxmax")), parseFloat(pThis.getAttribute("countyExtentymax")), map.spatialReference);
    map.setExtent(countyGeometry);
    for (var index = 0; index < searchSettings.length; index++) {
        FetchPermitResults(searchSettings[index], countyGeometry, index);
    }
    var list = dojo.dom.byId("tdBreadCrumbs");
    items = list.getElementsByTagName("span");
    var itemsLength = items.length;
    if (items.length) {
        for (var i = itemsLength - 1; i >= 0; i--) {
            if (i > pThis.getAttribute("index")) {
                dojo.destroy(items[i]);
            }
        }
    }
}

//Clear breadcrumbs container

function ClearBreadCrumbs() {
    dojo.dom.byId("divBreadCrumbs").style.display = "none";
    dojo.dom.byId("tdBreadCrumbs").innerHTML = "";
    queryExecutedCount = 0;
    countyGeometry = null;
    dojo.dom.byId("imgSearchLoader").style.display = "none";
    HideTransparentContainer();
    dojo['dom-construct'].empty(dojo.dom.byId('tblAddressResults'));
    RemoveScrollBar(dojo.dom.byId('divAddressScrollContainer'));
    isCountySearched = false;
}

//Locate searched permit on map and display the infowindow for the same

function LocatePermitOnMap(mapPoint, attributes, layerID, fields) {
    if (mapPoint) {
        if (!isMobileDevice) {
            ShowInfoWindowDetails(mapPoint, attributes, null, layerID, null, fields);
        } else {
            ShowMobileInfoWindow(mapPoint, attributes, layerID, fields);
        }
    }
    if (!isMobileDevice) {
        if (dojo['dom-geometry'].getMarginBox("divAddressContent").h > 0) {
            dojo['dom-class'].replace("divAddressContent", "hideContainerHeight", "showContainerHeight");
            dojo.dom.byId('divAddressContent').style.height = '0px';
        }
    }
    if (isMobileDevice) {
        HideAddressContainer();
    }
}

//Display the current location of the user

function ShowMyLocation() {
    var geometryService = new esri.tasks.GeometryService(responseObject.GeometryService);
    map.getLayer(tempGraphicsLayerId).clear();
    HideBaseMapLayerContainer();
    HideShareAppContainer();
    HideAddressContainer();
    var cTimeout = 8000 /* ms */,
        cBackupTimeout = 16000
    backupTimeoutTimer = setTimeout(function () {
        alert(messages.getElementsByTagName("geolocationPositionUnavailable")[0].childNodes[0].nodeValue);
    }, cBackupTimeout);

    navigator.geolocation.getCurrentPosition(function (position) {
        clearTimeout(backupTimeoutTimer);
        ShowProgressIndicator();
        mapPoint = new esri.geometry.Point(position.coords.longitude, position.coords.latitude, new esri.SpatialReference({
            wkid: 4326
        }));
        var graphicCollection = new esri.geometry.Multipoint(new esri.SpatialReference({
            wkid: 4326
        }));
        graphicCollection.addPoint(mapPoint);
        map.infoWindow.hide();
        geometryService.project([graphicCollection], map.spatialReference, function (newPointCollection) {
            if (isWebMap) {
                var bmap = baseMapId;
            } else {
                for (var bMap = 0; bMap < responseObject.BaseMapLayers.length; bMap++) {
                    if (responseObject.BaseMapLayers[bMap].MapURL) {
                        if (map.getLayer(responseObject.BaseMapLayers[bMap].Key).visible) {
                            var bmap = responseObject.BaseMapLayers[bMap].Key;
                        }
                    }
                }
            }
            if (!map.getLayer(bmap).fullExtent.contains(newPointCollection[0].getPoint(0))) {
                mapPoint = selectedMapPoint = null;
                map.getLayer(tempGraphicsLayerId).clear();
                map.infoWindow.hide();
                HideProgressIndicator();
                alert(messages.getElementsByTagName("geoLocation")[0].childNodes[0].nodeValue);
                return;
            }
            selectedMapPoint = null;
            featureID = infoWindowLayerID = searchFeatureID = searchInfoWindowLayerID = null;
            map.infoWindow.hide();
            mapPoint = newPointCollection[0].getPoint(0);
            map.setLevel(responseObject.ZoomLevel);
            map.centerAt(mapPoint);
            var locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(responseObject.LocatorSettings.DefaultLocatorSymbol, responseObject.LocatorSettings.MarkupSymbolSize.width, responseObject.LocatorSettings.MarkupSymbolSize.height);
            var graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {
                "Locator": true
            }, null);
            map.getLayer(tempGraphicsLayerId).add(graphic);
            HideProgressIndicator();
        }, function (error) {
            alert(error.message);
            HideProgressIndicator();
        });
    },
        function (error) {
            clearTimeout(backupTimeoutTimer);
            HideProgressIndicator();
            GeolocationErrorHandler(error);
        }, {
            timeout: cTimeout
        });
}

function GeolocationErrorHandler(error) {
    switch (error.code) {
        case error.TIMEOUT:
            alert(messages.getElementsByTagName("geolocationTimeout")[0].childNodes[0].nodeValue);
            break;
        case error.POSITION_UNAVAILABLE:
            alert(messages.getElementsByTagName("geolocationPositionUnavailable")[0].childNodes[0].nodeValue);
            break;
        case error.PERMISSION_DENIED:
            alert(messages.getElementsByTagName("geolocationPermissionDenied")[0].childNodes[0].nodeValue);
            break;
        case error.UNKNOWN_ERROR:
            alert(messages.getElementsByTagName("geolocationUnKnownError")[0].childNodes[0].nodeValue);
            break;
    }
}

//Query the features while sharing infowindow

function ShareInfoWindow() {
    ShowProgressIndicator();
    for (var index = 0; index < searchSettings.length; index++) {
        if (searchSettings[index].Title == searchInfoWindowLayerID) {
            var layerIndex = index;
            var queryTask = new esri.tasks.QueryTask(searchSettings[index].QueryLayerId);
            esri.request({
                url: searchSettings[index].QueryLayerId + "?f=json",
                load: function (data) {
                    for (var p = 0; p < data.fields.length; p++) {
                        if (data.fields[p].type == "esriFieldTypeOID") {
                            var objID = data.fields[p].name;
                            break;
                        }
                    }
                    var query = new esri.tasks.Query();
                    query.where = objID + "=" + searchFeatureID;
                    query.outFields = ["*"];
                    query.outSpatialReference = map.spatialReference;
                    query.returnGeometry = true;
                    queryTask.execute(query, function (features) {
                        for (var i in features.features[0].attributes) {
                            if (!features.features[0].attributes[i]) {
                                features.features[0].attributes[i] = responseObject.ShowNullValueAs;
                            }
                        }
                        if (!isMobileDevice) {
                            ShowInfoWindowDetails(features.features[0].geometry, features.features[0].attributes, null, layerIndex, null, features.fields);
                        } else {
                            ShowMobileInfoWindow(features.features[0].geometry, features.features[0].attributes, layerIndex, features.fields);
                        }
                    });
                },
                error: function (err) {
                    alert(err.message);
                }
            });
            break;
        }
    }
    HideProgressIndicator();
}