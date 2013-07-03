/** @license
| Version 10.1.1
| Copyright 2012 Esri
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
dojo.provide("js.config");
dojo.declare("js.config", null, {

    // This file contains various configuration settings for "Permit Status" template
    // 
    // Use this file to perform the following:
    //
    // 1.  Specify application Name                      - [ Tag(s) to look for: ApplicationName ]
    // 2.  Set path for application icon                 - [ Tag(s) to look for: ApplicationIcon ]
    // 3.  Set splash screen message                     - [ Tag(s) to look for: SplashScreenMessage ]
    // 4.  Set URL for help page                         - [ Tag(s) to look for: HelpURL ]
    // 5.  Specify URLs for base maps                    - [ Tag(s) to look for: BaseMapLayers ]
    // 6.  Set initial map extent                        - [ Tag(s) to look for: DefaultExtent ]
    // 7.  Choose to use WebMap or map services          - [ Tag(s) to look for: UseWebmap <true/false> ]
    // 8.  Specify WebMapId, if using WebMap             - [ Tag(s) to look for: WebMapId ]
    // 9.  Specify URLs for operational layers in WebMap - [ Tag(s) to look for: PermitResultDataForWebmap ]
    // 10. Or for using map services:
    // 10a.Specify URLs for operational layers           - [ Tag(s) to look for: PermitResultData, CountyLayerData ]
    // 10b.Enable or disable auto-complete feature for Permit search
    //                                                   - [ Tag(s) to look for: AutoCompleteForPermit]
    // 10d.Customize info-Popup size                     - [ Tag(s) to look for: InfoPopupHeight, InfoPopupWidth ]
    // 10e.Customize data formatting                     - [ Tag(s) to look for: ShowNullValueAs, FormatDateAs ]
    // 11. Customize address search settings             - [ Tag(s) to look for: LocatorSettings]
    // 12. Set URL for geometry service                  - [ Tag(s) to look for: GeometryService ]  
    // 13. Specify URLs for map sharing                  - [ Tag(s) to look for: MapSharingOptions,TinyURLServiceURL, TinyURLResponseAttribute, FacebookShareURL, TwitterShareURL, ShareByMailLink ]

    // ------------------------------------------------------------------------------------------------------------------------
    // GENERAL SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------
    // Set application title
    ApplicationName: "Permit Status",

    // Set application icon path
    ApplicationIcon: "images/logo.png",

    // Set splash window content - Message that appears when the application starts
    SplashScreen: {
        Message: "Lorem ipsum dolor sit er elit lamet, consectetaur cillium adipisicing pecu, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Nam liber te conscient to factor tum poen legum odioque civiuda.",
        isVisibile: true
    },

    // Set URL of help page/portal
    HelpURL: "help.htm",

    // ------------------------------------------------------------------------------------------------------------------------
    // BASEMAP SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------
    // Set baseMap layers
    // Please note: All base maps need to use the same spatial reference. By default, on application start the first basemap will be loaded 

    BaseMapLayers: [{
        Key: "topoMap",
        ThumbnailSource: "images/topographic.jpg",
        Name: "Topographic Map",
        MapURL: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"

    }, {
        Key: "streetMap",
        ThumbnailSource: "images/streets.png",
        Name: "Street Map",
        MapURL: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer"
    }],

    // Initial map extent. Use comma (,) to separate values and don t delete the last comma
    DefaultExtent: "-9382293, 3180837, -8612076, 3425801",

    // ------------------------------------------------------------------------------------------------------------------------
    // OPERATIONAL DATA SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------

    // Configure operational layers:

    // Choose if you want to use WebMap or Map Services for operational layers
    UseWebmap: false,

    // if using WebMap, specify WebMapID within quotes, otherwise leave this empty and configure operational layers
    WebMapId: "03793c9b4c724e11bffe314c01e94aa9",

    // Configure operational layers for WebMap:
    PermitResultDataForWebmap: {
        StatePermit_7989: {
            ListDisplayText: "Permit Number",
            ListFieldName: "${PermitNumber}",
            SearchField: "${PermitNumber}",
            PermitType: "${Type}",
            InfoWindowHeader: "${PROJ_NAME}",
            InfoWindowContent: "${PermitNumber}",
            isDynamicMapService: true,
            SearchQuery: "UPPER(PermitNumber) LIKE '${0}%' OR UPPER(PROJ_NAME) LIKE '${0}%' OR UPPER(SITE_NAME) LIKE '${0}%' OR UPPER(Type) LIKE '${0}%'"
        },
        ERP_8441: {
            ListDisplayText: "Permit Number",
            ListFieldName: "${ERP_PERMIT_NBR}",
            SearchField: "${ERP_PERMIT_NBR}",
            PermitType: "${ERP_PERMIT_TYPE_DESC}",
            InfoWindowHeader: "${PROJECT_NAME}",
            InfoWindowContent: "${ERP_PERMIT_NBR}",
            isDynamicMapService: true,
            SearchQuery: "UPPER(ERP_PERMIT_NBR) LIKE '${0}%' OR UPPER(PROJECT_NAME) LIKE '${0}%' OR UPPER(ERP_PERMIT_TYPE_DESC) LIKE '${0}%' OR UPPER(PERMITTEE_NAME) LIKE '${0}%'"
        },
        CUP_7370: {
            ListDisplayText: "Permit Number",
            ListFieldName: "${WUP_PERMIT_NBR}",
            SearchField: "${WUP_PERMIT_NBR}",
            PermitType: "${WUP_PERMIT_TYPE_DESC}",
            InfoWindowHeader: "${SITE_PROJECT_NAME}",
            InfoWindowContent: "${WUP_PERMIT_NBR}",
            isDynamicMapService: true,
            SearchQuery: "UPPER(WUP_PERMIT_NBR) LIKE '${0}%' OR UPPER(SITE_PROJECT_NAME) LIKE '${0}%' OR UPPER(WUP_PERMIT_TYPE_DESC) LIKE '${0}%' OR UPPER(PERMITTEE_NAME) LIKE '${0}%'"
        }
    },

    // Configure operational layers:

    //  ListDisplayText: Text to be displayed in the InfoWindow when there are multiple permits at a particular point. 
    //	ListFieldName: Attribute to be displayed in the InfoWindow when there are multiple permits at a particular point
    //	SearchField: Attribute that will be displayed when user searches for a particular permit.
    //	PermitType:  Attribute based on which the permit results will be grouped
    //	SearchQuery: Query based on which the operational layers will be searched.
    //  InfoWindowHeader: Choose content/fields for the info window header
    //  InfoWindowContent: Choose content/fields for the info window
    //	ServiceURL: URL of the layer.
    //	isDynamicMapService: Control flag to choose if the operational layers should be added as a dynamic map service layer or a feature layer ,
    //	InfoWindowData: Info-popup is a popup dialog that gets displayed on selecting a feature
    //  DisplayText: Field used for displaying the Text instead of alias names
    //  FieldName: Field used for getting the details of the particular service feature

    PermitResultData: {
        StatePermit_7989: {
            ListDisplayText: "Permit Number",
            ListFieldName: "${PermitNumber}",
            SearchField: "${PermitNumber}",
            PermitType: "${Type}",
            SearchQuery: "UPPER(PermitNumber) LIKE '${0}%' OR UPPER(PROJ_NAME) LIKE '${0}%' OR UPPER(SITE_NAME) LIKE '${0}%' OR UPPER(Type) LIKE '${0}%'",
            InfoWindowHeader: "${PROJ_NAME}",
            InfoWindowContent: "${PermitNumber}",
            ServiceURL: "http://50.18.115.76:6080/arcgis/rest/services/StatePermit/MapServer/0",
            isDynamicMapService: true,
            InfoWindowData: [{
                DisplayText: "Prog Area:",
                FieldName: "${PROG_AREA}"
            }, {
                DisplayText: "Permit Number:",
                FieldName: "${PermitNumber}"
            }, {
                DisplayText: "Project No:",
                FieldName: "${PROJ_NO}"
            }, {
                DisplayText: "Project Name:",
                FieldName: "${PROJ_NAME}"
            }, {
                DisplayText: "Site Name:",
                FieldName: "${SITE_NAME}"
            }, {
                DisplayText: "Address:",
                FieldName: "${ADDRESS}"
            }, {
                DisplayText: "City:",
                FieldName: "${CITY}"
            }, {
                DisplayText: "State:",
                FieldName: "${STATE}"
            }, {
                DisplayText: "Type:",
                FieldName: "${Type}"
            }, {
                DisplayText: "Program:",
                FieldName: "${Program}"
            }, {
                DisplayText: "Issue Date:",
                FieldName: "${Issue_Date}"
            }, {
                DisplayText: "Receive_Date:",
                FieldName: "${Receive_Date}"
            }, {
                 DisplayText: "County:",
                 FieldName: "${County}"
             }]
        },
        ERP_8441: {
            ListDisplayText: "Permit Number",
            ListFieldName: "${ERP_PERMIT_NBR}",
            SearchField: "${ERP_PERMIT_NBR}",
            PermitType: "${ERP_PERMIT_TYPE_DESC}",
            SearchQuery: "UPPER(ERP_PERMIT_NBR) LIKE '${0}%' OR UPPER(PROJECT_NAME) LIKE '${0}%' OR UPPER(ERP_PERMIT_TYPE_DESC) LIKE '${0}%' OR UPPER(PERMITTEE_NAME) LIKE '${0}%'",
            InfoWindowHeader: "${PROJECT_NAME}",
            InfoWindowContent: "${ERP_PERMIT_NBR}",
            ServiceURL: "http://50.18.115.76:6080/arcgis/rest/services/ERP/MapServer/0",
            isDynamicMapService: true,
            InfoWindowData: [{
                DisplayText: "Application ID:",
                FieldName: "${ERP_APPLICATION_ID}"
            }, {
                DisplayText: "Permit Number:",
                FieldName: "${ERP_PERMIT_NBR}"
            }, {
                DisplayText: "Permittee Name:",
                FieldName: "${PERMITTEE_NAME}"
            }, {
                DisplayText: "Project Name:",
                FieldName: "${PROJECT_NAME}"
            }, {
                DisplayText: "Address:",
                FieldName: "${ADDRESS}"
            }, {
                DisplayText: "City:",
                FieldName: "${CITY}"
            }, {
                DisplayText: "Type:",
                FieldName: "${ERP_PERMIT_TYPE_DESC}"
            }, {
                DisplayText: "Status:",
                FieldName: "${ERP_STATUS_DESC}"
            }, {
                DisplayText: "County:",
                FieldName: "${COUNTY_NAME}"
            }, {
                DisplayText: "URL:",
                FieldName: "${ERP_EXT_URL}"
            }]
        },
        CUP_7370: {
            ListDisplayText: "Permit Number",
            ListFieldName: "${WUP_PERMIT_NBR}",
            SearchField: "${WUP_PERMIT_NBR}",
            PermitType: "${WUP_PERMIT_TYPE_DESC}",
            SearchQuery: "UPPER(WUP_PERMIT_NBR) LIKE '${0}%' OR UPPER(SITE_PROJECT_NAME) LIKE '${0}%' OR UPPER(WUP_PERMIT_TYPE_DESC) LIKE '${0}%' OR UPPER(PERMITTEE_NAME) LIKE '${0}%'",
            InfoWindowHeader: "${SITE_PROJECT_NAME}",
            InfoWindowContent: "${WUP_PERMIT_NBR}",
            ServiceURL: "http://50.18.115.76:6080/arcgis/rest/services/CUP/MapServer/0",
            isDynamicMapService: true,
            InfoWindowData: [{
                DisplayText: "Application ID:",
                FieldName: "${WUP_APPLICATION_ID}"
            }, {
                DisplayText: "Permit Number:",
                FieldName: "${WUP_PERMIT_NBR}"
            }, {
                DisplayText: "Permittee Name:",
                FieldName: "${PERMITTEE_NAME}"
            }, {
                DisplayText: "Project Name:",
                FieldName: "${SITE_PROJECT_NAME}"
            }, {
                DisplayText: "Address:",
                FieldName: "${ADDRESS}"
            }, {
                DisplayText: "City:",
                FieldName: "${CITY}"
            }, {
                DisplayText: "Type:",
                FieldName: "${WUP_PERMIT_TYPE_DESC}"
            }, {
                DisplayText: "Status:",
                FieldName: "${WUP_APP_STATUS_DESC}"
            }, {
                DisplayText: "County:",
                FieldName: "${COUNTYNAME}"
            }, {
                DisplayText: "URL:",
                FieldName: "${WUP_EXT_URL}"
            }]
        }
    },

    CountyLayerData: {
        Key: "CountyLayer",
        SearchQuery: "NAME LIKE '${0}%'",
        CountyDisplayField: "${NAME}",
        UseGeocoderService: true,
        ServiceURL: "http://50.18.115.76:6080/arcgis/rest/services/StatePermit/MapServer/1",
        isDynamicMapService: true
    },

    //flag to enable or disable auto-complete feature for Permit search
    AutoCompleteForPermit: true,

    // ------------------------------------------------------------------------------------------------------------------------
    // INFO-POPUP SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------

    // Info-popup is a popup dialog that gets displayed on selecting a feature 
    // Set the content to be displayed on the info-Popup. Define labels, field values, field types and field formats

    // Set size of the info-Popup - select maximum height and width in pixels (not applicable for tabbed info-Popup)
    //minimum height should be 270 for the info-popup in pixels
    InfoPopupHeight: 310,

    //minimum width should be 330 for the info-popup in pixels 
    InfoPopupWidth: 330,

    // Set string value to be shown for null or blank values
    ShowNullValueAs: "N/A",

    // Set date format
    FormatDateAs: "MMM dd, yyyy",

    // Sets the object id for querying while sharing the infowindow
    ShareQuery: "OBJECTID = '${0}'",

    // ------------------------------------------------------------------------------------------------------------------------
    // ADDRESS SEARCH SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------  
    // Set locator settings such as locator symbol, size, zoom level, display fields, match score
    LocatorSettings: {
        DefaultLocatorSymbol: "images/redpushpin.png",
        MarkupSymbolSize: {
            width: 35,
            height: 35
        },
        Locators: [{
            DisplayText: "Address",
            LocatorDefaultAddress: "26650 Foamflower Blvd, Wesley Chapel, FL, 33544",
            LocatorParamaters: { SearchField: "text", SearchResultField: "outFields", SearchCountField: "maxLocations", SearchBoundaryField: "bbox", SpatialReferenceField: "outSR" },
            LocatorURL: "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find",
            CandidateFields: "Addr_type, Type, Score, Match_addr",
            DisplayField: "${Match_addr}",
            ZoomLevel: 10,
            AddressMatchScore: { Field: "Score", Value: 80 },
            LocatorFieldName: 'Addr_type',
            LocatorFieldValues: ["StreetAddress", "StreetName", "PointAddress"],
            CountyFields: { FieldName: 'Type', Value: ['county', 'city', 'park', 'lake', 'mountain', 'state or province'] },
            MaxResults: 200

        }, {
            DisplayText: "Location",
            LocatorDefaultLocation: "Baker",
            DisplayField: "${NAME}"

        }, {
            DisplayText: "Permit",
            LocatorDefaultPermit: "10"
        }]
    },

    // ------------------------------------------------------------------------------------------------------------------------
    // GEOMETRY SERVICE SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------

    // Set geometry service URL
    GeometryService: "http://localgovtemplates2.esri.com/ArcGIS/rest/services/Geometry/GeometryServer",

    // ------------------------------------------------------------------------------------------------------------------------
    // SETTINGS FOR MAP SHARING
    // ------------------------------------------------------------------------------------------------------------------------

    // Set URL for TinyURL service, and URLs for social media
    MapSharingOptions: {
        TinyURLServiceURL: "http://api.bit.ly/v3/shorten?login=esri&apiKey=R_65fd9891cd882e2a96b99d4bda1be00e&uri=${0}&format=json",
        TinyURLResponseAttribute: "data.url",
        FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=Permit%20Status",
        TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=Permit%20Status ${0}",
        ShareByMailLink: "mailto:%20?subject=Checkout%20this%20map!&body=${0}"
    }
});