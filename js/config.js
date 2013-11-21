/*global dojo */
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
dojo.provide("js.config");
dojo.declare("js.config", null, {

    // This file contains various configuration settings for "Permit Status" template
    //
    // Use this file to perform the following:
    //
    // 1.  Specify application Name                      - [ Tag(s) to look for: ApplicationName ]
    // 2.  Set path for application icon                 - [ Tag(s) to look for: ApplicationIcon ]
    // 3.  Set path for application favicon              - [ Tag(s) to look for: ApplicationFavicon ]
    // 4.  Set splash screen message                     - [ Tag(s) to look for: SplashScreenMessage ]
    // 5.  Set URL for help page                         - [ Tag(s) to look for: HelpURL ]
    // 6.  Specify URLs for base maps                    - [ Tag(s) to look for: BaseMapLayers ]
    // 7.  Set initial map extent                        - [ Tag(s) to look for: DefaultExtent ]
    // 8.  Specify WebMapId, if using WebMap             - [ Tag(s) to look for: WebMapId ]
    // 9.  Or for using map services:
    // 9a. Specify URLs for operational layers           - [ Tag(s) to look for: OperationalLayers, InfoWindowSettings, SearchSettings, CountyLayerData, ReferenceOverlayLayer ]
    // 9b. Customize zoom level for address search       - [ Tag(s) to look for: ZoomLevel ]
    // 9c. Enable or disable auto-complete feature for Permit search
    //                                                   - [ Tag(s) to look for: AutocompleteForPermit]
    // 9d. Enable or disable using the configured zoom level for selected polygon feature
    //                                                   - [ Tag(s) to look for: ZoomToPolygonGeometry]
    // 9e. Customize info-Popup size                     - [ Tag(s) to look for: InfoPopupHeight, InfoPopupWidth ]
    // 9f. Customize data formatting                     - [ Tag(s) to look for: ShowNullValueAs, FormatDateAs ]
    // 10. Customize address search settings             - [ Tag(s) to look for: LocatorSettings]
    // 11. Set URL for geometry service                  - [ Tag(s) to look for: GeometryService ]
    // 12. Specify URLs for map sharing                  - [ Tag(s) to look for: MapSharingOptions,TinyURLServiceURL, TinyURLResponseAttribute, FacebookShareURL, TwitterShareURL, ShareByMailLink ]

    // ------------------------------------------------------------------------------------------------------------------------
    // GENERAL SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------
    // Set application title
    ApplicationName: "Permit Status",

    // Set application icon path
    ApplicationIcon: "images/logo.png",

    // Set application Favicon path
    ApplicationFavicon: "images/favicon.ico",

    // Set splash window content - Message that appears when the application starts
    SplashScreen: {
        Message: "Welcome to the <b>Permit Status Application</b> <br/> <hr/> <br/>The <b>Permit Status Application</b> enables constituents in the State, NGO's, contractors <br/> and other entities to search for and discover <br/> information about permitted activities within the state.<br/></br> To locate a permit, simply enter an address, location or permit information in the search box, or use your current location. The permit(s) and relevant information will be presented to the user.",
        isVisible: true
    },

    // Set URL of help page/portal
    HelpURL: "help.htm",

    // ------------------------------------------------------------------------------------------------------------------------
    // BASEMAP SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------
    // Set baseMap layers
    // Please note: All base maps need to use the same spatial reference. By default, on application start the first basemap will be loaded

    BaseMapLayers: [{
        Key: "natgeoMap",
        ThumbnailSource: "images/nationalgeo.png",
        Name: "National Geographic Map",
        MapURL: "http://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer"

    }, {
        Key: "imageryMap",
        ThumbnailSource: "images/imagery.png",
        Name: "Imagery Map",
        MapURL: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
    }],

    // Initial map extent. Use comma (,) to separate values and dont delete the last comma
    DefaultExtent: "-10158000, 4002000, -8984000, 4554000",

    // ------------------------------------------------------------------------------------------------------------------------
    // OPERATIONAL DATA SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------

    // Configure operational layers:

    // Choose if you want to use WebMap or Map Services for operational layers. If using WebMap, specify WebMapId within quotes, otherwise leave this empty and configure operational layers
    WebMapId: "",

    // If you are using webmap then skip below section for configuring operational layers and move to 'SearchSettings'

    // Configure operational layers below.
    // ServiceURL: URL of the layer.
    // LoadAsServiceType: Field to specify if the operational layers should be added as dynamic map service layer or feature layer or tiled map service layer.
    //                    Supported service types are 'dynamic', 'feature' and 'tiled' only.
    OperationalLayers: [{
        ServiceURL: "http://arcgis-gov-1244222493.us-west-2.elb.amazonaws.com/arcgis/rest/services/Permits/MapServer/0",
        LoadAsServiceType: "dynamic"
    }],

    // Configure settings for loading and performing query on the county layer. County layer will be queried only when the 'UseGeocoderService' is set to false
    // Title: Name of the layer as defined in the map service.
    // ServiceURL: URL of the layer. The URL should include the layer id.
    // LoadAsServiceType: Supported service types are 'dynamic', 'feature', 'tiled' only.
    //                    Use this flag to specify if the operational layers should be added as dynamic map service layer or feature layer or tiled map service layer.
    // SearchExpression: Used while searching counties without using Geocoder service.
    // CountyDisplayField: Attribute that will be displayed in the search box when user searches for a particular county.
    // UseGeocoderService: When this flag is set to true, then the Location search will be performed using configured geocode service.
    //                     When it is set to false then ServiceURL mentioned below will be used to perform location search.
    // If 'UseGeocoderService' is set to true allow blank values for 'ServiceURL, SearchExpression and CountyDisplayField'.
    // If 'UseGeocoderService' is set to false and one of the fields ('ServiceURL, SearchExpression and CountyDisplayField') is not specified then an error message is displayed.  If LoadAsServiceType is not set then load the serviceURL as dynamic map service.

    CountyLayerData: {
        Title: "CountyLayer",
        ServiceURL: "http://arcgis-gov-1244222493.us-west-2.elb.amazonaws.com/arcgis/rest/services/Permits/MapServer",
        LoadAsServiceType: "dynamic",
        SearchExpression: "NAME LIKE '${0}%'",
        CountyDisplayField: "${NAME}",
        UseGeocoderService: true
    },

    // Use this section to configure search settings for both Webmap and Operational layer implementations. All the fields in this section are mandatory.
    // The Title and QueryLayerId fields should be the same as Title and QueryLayerId fields in InfoWindowSettings.
    // Title: Name of the layer as defined in the webmap/operational layers. In case of webmap implementations, it must match layer name specified in webmap and in case of operational layers it should be the same as service name
    // QueryLayerId: Layer index used for performing queries.
    // ListDisplayText: Text to be displayed in the InfoWindow when there are multiple permits at a particular point.
    // ListFieldName: Attribute to be displayed in the InfoWindow when there are multiple permits at a particular point.
    // SearchDisplayFields: Attribute that will be displayed in the search box when user searches for a particular permit.
    // SearchExpression: Query to perform permit search.

    SearchSettings: [{
        Title: "Permits",
        QueryLayerId: "0",
        ListDisplayText: "Permit Number",
        ListFieldName: "${PERMITID}",
        SearchDisplayFields: "${PERMITID} / ${PERMITDESC} / ${APPLICANT}",
        SearchExpression: "UPPER(PERMITID) LIKE '${0}%' OR UPPER(PERMITDESC) LIKE '${0}%' OR UPPER(APPLICANT) LIKE '${0}%' OR UPPER(PERMITTYPE) LIKE '${0}%'"
    }],

    // Configure info-popup settings (The Title and QueryLayerId fields should be the same as Title and QueryLayerId fields in SearchSettings)
    // Title: Name of the layer as defined in the map service.
    // QueryLayerId: Layer index used for performing queries.
    // InfoWindowHeader: Specify field for the info window header
    // InfoWindowContent: Specify field to be displayed in callout bubble for mobile devices
    // InfoWindowData: Set the content to be displayed in the info-Popup. Define labels and field values.
    //                    These fields should be present in the layer referenced by 'QueryLayerId' specified under section 'SearchSettings'
    // DisplayText: Caption to be displayed instead of field alias names. Set this to empty string ("") if you wish to display field alias names as captions.
    // FieldName: Field used for displaying the value
    InfoWindowSettings: [{
        Title: "Permits",
        QueryLayerId: "0",
        InfoWindowHeader: "${APPLICANT}",
        InfoWindowContent: "${PERMITID}",
        InfoWindowData: [{
            DisplayText: "Permit Type:",
            FieldName: "${PERMITTYPE}"
        },{
            DisplayText: "Permit ID:",
            FieldName: "${PERMITID}"
        }, {
            DisplayText: "Site ID:",
            FieldName: "${SITEID}"
        }, {
          
            DisplayText: "Location:",
            FieldName: "${LOCDESC}"
        }, {
            DisplayText: "Permit Description:",
            FieldName: "${PERMITDESC}"
        }, {
            DisplayText: "County:",
            FieldName: "${COUNTY}"
        }, {
            DisplayText: "Approval Date:",
            FieldName: "${APPROVEDDT}"
        }, {
            DisplayText: "Effective Date:",
            FieldName: "${EFFECTIVEDT}"
        
       },
	 {
            DisplayText: "Permit Info:",
            FieldName: "${URL}"
        
       }]
    }], 

    // ServiceUrl is the REST end point for the reference overlay layer
    // DisplayOnLoad setting is used to show or hide the reference overlay layer. Reference overlay will be shown when it is set to true

    ReferenceOverlayLayer: {
        ServiceUrl: "",
        DisplayOnLoad: ""
    },

    // Following zoom level will be set for the map upon searching an address or permit
    ZoomLevel: 14,

    // Flag to enable or disable auto-complete search feature for Permit search
    AutocompleteForPermit: true,

    // When set to true, application will zoom to the extents/geometry of selected polygon; when set to false, application will zoom to configured ‘ZoomLevel’ for selected polygon.
    ZoomToPolygonGeometry: true,

    // ------------------------------------------------------------------------------------------------------------------------
    // INFO-POPUP UI SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------

    // Info-popup is a popup dialog that gets displayed on selecting a feature
    // Set size of the info-Popup - select maximum height and width in pixels (not applicable for tabbed info-Popup)
    // Minimum height should be 270 for the info-popup in pixels
    InfoPopupHeight: 310,

    // Minimum width should be 330 for the info-popup in pixels
    InfoPopupWidth: 330,

    // Set string value to be shown for null or blank values
    ShowNullValueAs: "N/A",

    // Set date format
    FormatDateAs: "MMM dd, yyyy",

    // ------------------------------------------------------------------------------------------------------------------------
    // ADDRESS SEARCH SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------
    // Set locator settings such as locator symbol, size, display fields, match score
    // DisplayText: Set the title for type of search e.g. 'Address', 'Location', 'Permit'.
    // DefaultLocatorSymbol: Set the image path for locator symbol. e.g. pushpin.
    // MarkupSymbolSize: Set the image dimensions in pixels for locator symbol.
    // LocatorDefaultAddress: Set the default address to search.
    // LocatorParameters: Required parameters to search the address candidates.
    //   SearchField: The name of geocode service input field that accepts the search address. e.g. 'SingleLine' or 'Address'.
    //   SearchBoundaryField: The name of geocode service input field that accepts an extent to search an input address within. e.g."searchExtent".
    // LocatorURL: Specify URL for geocode service.
    // LocatorOutFields: The list of outfields to be included in the result set provided by geocode service.
    // DisplayField: Specify the outfield of geocode service. The value in this field will be displayed for search results in the application.
    // AddressMatchScore: Required parameters to specify the accuracy of address match.
    //   Field: Set the outfield of geocode service that contains the Address Match Score.
    //   Value: Set the minimum score value for filtering the candidate results. The value should a number between 0-100.
    // AddressSearch: Candidates based on which the address search will be performed.
    //   FilterFieldName: Set the outfield that contains the match level for geocode request. e.g. For World GeoCode, the field that contains the match level is 'Addr_type'.
    //   FilterFieldValues: Specify the desired match levels to filter address search results. e.g. 'StreetAddress', 'StreetName' etc.
    // PlaceNameSearch: Attributes based on which the layers will be queried when a location search is performed.
    //   LocatorFieldValue: Set the match level for county/place search. e.g. 'POI' will contain all administrative boundary
    //   FilterFieldName: Set the feature type for results returned by the geocode request. e.g. For World GeoCode, the field that contains the feature type is 'Type'.
    //   FilterFieldValues: Specify the feature types to filter search results. e.g. 'county', 'city' etc.
    // LocatorDefaultLocation: Set the default location to search.
    // LocatorDefaultPermit: Set the default permit to search.
    // Set locator settings such as locator symbol, size, display fields, match score
    // LocatorParameters: Parameters(text, outFields, maxLocations, bbox, outSR) used for address and location search.
    // AddressSearch: Candidates based on which the address search will be performed.
    // PlaceNameSearch: Attributes based on which the layers will be queried when a location search is performed.
    // AddressMatchScore: Setting the minimum score for filtering the candidate results.
    // MaxResults: Maximum number of locations to display in the results menu.
    LocatorSettings: {
        DefaultLocatorSymbol: "images/redpushpin.png",
        MarkupSymbolSize: {
            width: 35,
            height: 35
        },
        Locators: [{
            DisplayText: "Address",
            LocatorDefaultAddress: "401 Church Street, Nashville, TN",
            LocatorParameters: {
                SearchField: "SingleLine",
                SearchBoundaryField: "searchExtent"
            },
            LocatorURL: "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
            LocatorOutFields: ["Addr_Type", "Type", "Score", "Match_Addr", "xmin", "xmax", "ymin", "ymax"],
            DisplayField: "${Match_Addr}",
            AddressMatchScore: {
                Field: "Score",
                Value: 80
            },
            AddressSearch: {
                FilterFieldName: 'Addr_Type',
                FilterFieldValues: ["StreetAddress", "StreetName", "PointAddress", "POI"]
            },
            PlaceNameSearch: {
                LocatorFieldValue: "POI",
                FilterFieldName: 'Type',
                FilterFieldValues: ['county', 'city', 'park', 'lake', 'mountain', 'state or province', 'state capital']
            },
            MaxResults: 200
            }, {
            DisplayText: "Location",
            LocatorDefaultLocation: "Davidson County"

        }, {
            DisplayText: "Permit",
            LocatorDefaultPermit: "NR1003.10"
        }]
    },

    // ------------------------------------------------------------------------------------------------------------------------
    // GEOMETRY SERVICE SETTINGS
    // ------------------------------------------------------------------------------------------------------------------------

    // Set geometry service URL
    GeometryService: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",

    // ------------------------------------------------------------------------------------------------------------------------
    // SETTINGS FOR MAP SHARING
    // ------------------------------------------------------------------------------------------------------------------------

    // Set URL for TinyURL service, and URLs for social media
    MapSharingOptions: {
        TinyURLServiceURL: "http://api.bit.ly/v3/shorten?login=esri&apiKey=R_65fd9891cd882e2a96b99d4bda1be00e&uri=${0}&format=json",
        TinyURLResponseAttribute: "data.url",
        FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=Permit%20Status",
        TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=Permit%20Status ${0}",
        ShareByMailLink: "mailto:%20?subject=Check%20out%20this%20map!&body=${0}"
    }
});