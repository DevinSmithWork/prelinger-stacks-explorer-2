// ================================= GLOBAL VARS

// Layout variables (values in pixels)
const oversize_shelf_heights = new Uint16Array([1940,1939,1940,1939,1940,1939,2397]);
const layout = {
    zoom_out_bounds_rect: undefined,
    total_stacks: 9,
    stack_y_spacer: 2909,
    zone_highlight_offset: 970,
    standard: {
        x: 0,
        stack_width: 62400,
        stack_height: 14033,
        bank_width: 5200,
        uniform_bank_width: 5200,
        height: 14033,
        shelf_heights: new Uint16Array([1455,1454,1455,1454,1455,1454,1455,1454,1198,1199]),
        multiple_shelf_heights: {
            "3": {
                "6": new Uint16Array([1445,979,951,959,1484,1455,1454,1455,1454,1198,1199]),
                "9": new Uint16Array([1461,1009,1140,1126,1137,1455,1454,1455,1454,1198,1199])
            },
            "4": {
                "5": new Uint16Array([1455,1454,1455,1454,1498,1735,1632,1591,1778])
            },
            "6": {
                "1": oversize_shelf_heights,
                "2": oversize_shelf_heights,
                "3": oversize_shelf_heights,
                "4": oversize_shelf_heights,
                "5": oversize_shelf_heights,
                "6": oversize_shelf_heights
            }
        }
    },
    stack_one: {
        x: 5200,
        stack_height: 14033,
        stack_width: 52000,
        uniform_bank_width: 5200,
        shelf_heights: new Uint16Array([1455,1454,1455,1454,1455,1454,1455,1454,1198,1199])
    },
    ephemera: {
        x: 7800,
        stack_width: 46720,
        stack_height: 14033,
        shelf_heights: new Uint16Array([1455,1454,1455,1454,1455,1454,1455,1239,1360,1361]),
        bank_widths: new Uint16Array([5200,5200,5200,5200,3880,3880,3880,3880,5200,5200]),
        narrow_width: 3880,
    },
    therkelson: {
        x: 23508,
        stack_width: 15424,
        stack_height: 7907,
        bank_width: 3846,
        uniform_bank_width: 3846,
        shelf_heights: new Uint16Array([1354,1354,1354,1354,1245,1246]),
        bank_widths: new Uint16Array([3846,3846,3846,3846]),
    },
    flat_file: {
        x: 26921,
        stack_width: 8558,
        stack_height: 5416,
        bank_widths: new Uint16Array([4972,3586]),
        shelf_heights: new Uint16Array([5416,5416])
    }
}

// General UI vars
var ui_vars = {
    menu_open: true,
    list_view: false,
    resize_handle_current_x: 0,
    resize_handle_new_x: 0,
    resize_handle_current_y: 0,
    resize_handle_new_y: 0,
    vertical_breakpoint: 640,
    vertical_mode: false
}

// Data from .jsons are loaded into these global vars
var stacks_data, zones_data, periodicals_data, sc_data, ia_data

// LET'S GO! Run the loading functions
loadLibraryDataWithCallbacks()
loadOSDData()
addWindowResizeEventListeners()
addResizeHandleEventListeners()


// ==================================== LOADING FUNCTIONS

// Window resize listener for switching horizontal and vertical mode
function addWindowResizeEventListeners() {

    // First, asign vertical_mode based on the current window width
    if (window.innerWidth <= ui_vars.vertical_breakpoint) {
        ui_vars.vertical_mode = true
    }

    // The listener function
    window.addEventListener('resize', function verticalModeCheck() {
        const menu_div = gid("menu-container")

        // Window changed from horizontal to vertical
        if (window.innerWidth <= ui_vars.vertical_breakpoint
            && ui_vars.vertical_mode == false) {
            ui_vars.vertical_mode = true
            menu_div.style.width = null
            gid("resize-handle").style.display = "none"

        // Window changed from vertical to horizontal
        } else if (window.innerWidth > ui_vars.vertical_breakpoint
            && ui_vars.vertical_mode == true) {
            ui_vars.vertical_mode = false
            menu_div.style.top = null
            menu_div.style.height = "100%"
            menu_div.style.width = gid("resize-handle").style.left
            r_handle_reset()

            if (ui_vars.menu_open == false) {
                gid("resize-handle").style.display = "none"
            } else {
                gid("resize-handle").style.display = "block"
            }
        }
    });

}


// Resize handle functions
function addResizeHandleEventListeners() {

    const r_handle = gid("resize-handle")
    const menu_container = gid("menu-container")

    // Double-click listener
    r_handle.addEventListener("dblclick", r_handle_reset)

    // onmousedown property set to the function below
    r_handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        // get the mouse cursor position at startup:
        ui_vars.resize_handle_current_x = e.clientX;

        // Mouseup sets the appropriate properties to null
        document.onmouseup = closeDragElement;

        // call whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        // calculate the new cursor position:
        ui_vars.resize_handle_new_x = ui_vars.resize_handle_current_x - e.clientX;
        ui_vars.resize_handle_current_x = e.clientX;

        // set the resize handle's new position, clamp to min/max
        const new_position = horizontal_clamp(ui_vars.resize_handle_new_x)
        r_handle.style.left = (new_position) + "px";

        // Set the menu width to the new position
        menu_container.style.width = r_handle.style.left

        function horizontal_clamp(new_x) {
            return (
                Math.min(
                    Math.max(r_handle.offsetLeft - new_x, 350),
                gid("zoom-out-button").offsetLeft - 40))
        }

    }

    // stop moving when mouse button is released:
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}


// Load the Open Sea Dragon (OSD) viewer and DZIs
function loadOSDData() {

    let tiles_array = []

    // Loads the DZI tilesets
    for (let i=1, i_end=layout.total_stacks+1, stack_y=0; i<i_end; i++) {

        // Stack filename and layout (from above const).
        const file_name = "dzi-files/STACK-" + i + "-FULL.jpg.dzi"
        const stack_layout = getStackLayout(i)

        // Add the tiled image to the array. Include layout data for each stack.
        tiles_array.push({
            tileSource: file_name,
            x: stack_layout.x,
            y: stack_y,
            width: stack_layout.stack_width,
            layout: stack_layout
        })

        // Increment stack_y but the current stack's height + spacer.
        stack_y += stack_layout.stack_height + layout.stack_y_spacer
    }

    // Initialize the viewer with the tiled images
    viewer = OpenSeadragon({
        id: "osd-container",
        showNavigator: false,
        showNavigationControl:false,
        silenceMultiImageWarnings: true,
        viewportMargins:{
            top:20,
            right:20,
            bottom:20,
            left:20
        },
        // arrange: {},
        placeholderFillStyle: "#666",
        blendTime: 0.25,
        zoomPerClick: 1,        // Disables zooming on single-click
        zoomPerScroll: 1.4,     // Increases mousewheel or pinch (default is 1.2)
        tileSources: tiles_array
    })

    // Helper: Returns the layout object for the passed stack number
    function getStackLayout(stack) {
        switch(stack) {
            case(1): return(layout.stack_one)
            case(7): return(layout.ephemera)
            case(8): return(layout.therkelson)
            case(9): return(layout.flat_file)
            default: return(layout.standard)
        }
    }   
}


// Loads the JSON files
function loadLibraryDataWithCallbacks() {
    let file_load_counter = 0
    const file_dir = "./json-files/"
    const json_files = ["library_nested.json", "periodicals.json", "ia.json",
        "special_collections.json", "zones_subzones.json"]

    // Kick off the async json file loads
    for (let i=0, i_end=json_files.length; i<i_end; i++) {
        update_loading_screen_new("Fetching " + json_files[i] + "...")
        fetch(file_dir + json_files[i])
            .then((response) => response.json())
            .then((json) => file_processor_test(json_files[i], json, i_end));
    }

    function file_processor_test(file, json, file_count) {
        update_loading_screen_new(file + " Loaded.")
        switch(file) {
            case("library_nested.json"): stacks_data = json; break;
            case("periodicals.json"): periodicals_data = json; break;
            case("special_collections.json"): sc_data = json; break;
            case("ia.json"): ia_data = json; break;
            case("zones_subzones.json"): zones_data = json; break;
        }

        file_load_counter++
        if (file_load_counter == file_count) {
            update_loading_screen_new("Populating sidebar lists...")

            // Build the sidebar UI elements
            populateZonesSidebar()
            populateSidebarLists("periodicals-list", "p", periodicals_data, false)
            populateSidebarLists("sc-list", "c", sc_data, false)
            populateSidebarLists("ia-list", "i", ia_data, true)
            addClickHandlers()

            // Hide the loading div
            update_loading_screen_new("Sidebars completed.")
            gid("loadingStatus").style.opacity = 0
            gid("loadingStatus").style.visibility = "hidden"
            gid("menu-container").style.opacity = 1
            gid("menu-container").style.visibility = "visible"
            gid("resize-handle").style.opacity = 1
            gid("resize-handle").style.visibility = "visible"
        }
    }
}




// ==================================== SIDEBAR-BUILDING FUNCTIONS

// Periodicals, Special Collections, IA item sidebars
function populateSidebarLists(list_id, item_id_prefix, data_source, is_ia) {
    const ul = new DocumentFragment()
    for (let i=0, n=data_source.length; i<n; i++) {
        // Internet Archive items are handled a little differently
        if (is_ia) {
            const li = buildIAListItem(data_source[i])
            ul.appendChild(li)
        } else {
            const li = quickNode("li", data_source[i].name)
            ul.appendChild(li)
            li.setAttribute("id", item_id_prefix + "-" + i)
            li.setAttribute("onclick", "hl(this);")
        }
    }
    document.getElementById(list_id).appendChild(ul)
}


// Zones / Subzones sidebar
function populateZonesSidebar() {
    const sidebar = new DocumentFragment()

    for (let i=0, zone_end=zones_data.length; i<zone_end; i++) {
        const zone = zones_data[i]

        // -------- ZONES
        const zone_details = quickNodeTag("details")
        const zone_summary = quickNode("summary", zone.name)

        // Attach to document fragment
        sidebar.appendChild(zone_details)
        zone_details.appendChild(zone_summary)

        // Adds the on-click for hilighting locations
        zone_summary.setAttribute("id", "z-" + i.toString() + "-summary")
        zone_summary.setAttribute("onclick", "hl(this);")

        // -------- SUBZONES
        // Loop the subzones and build the <ul>
        if (zone.name != "Ephemera"
            && zone.name != "Therkleson Collection"
            && zone.name != "Flat File") {

            const subzones = zone.sub 
            for (let j=0, subzone_end=subzones.length; j<subzone_end; j++) {
                const subzone = subzones[j]
                const subzone_details = quickNodeTag("details")
                const subzone_summary = quickNode("summary", subzone.name)

                // Adds the on-click highlighting
                subzone_summary.setAttribute("id", "s-" + i + "-" + j)
                subzone_summary.setAttribute("onclick", "hl(this);" )

                // Attach zone & subzone elements
                subzone_details.appendChild(subzone_summary)
                zone_details.appendChild(subzone_details)

                // Periodicals
                if (subzone.p != undefined) {
                    const periodicals_details = getZoneSidebarDetails(
                        "Periodicals (Shelves)", subzone.p, periodicals_data, "zp-")
                    subzone_details.appendChild(periodicals_details)
                }
                // Special Collections
                if (subzone.c != undefined) {
                    const collections_details = getZoneSidebarDetails(
                        "Sp. Collections (Shelves)", subzone.c, sc_data, "zc-")
                    subzone_details.appendChild(collections_details)
                }
                // IA Items
                if (subzone.i != undefined) {
                    const collections_details = getZoneSidebarDetails(
                        "Scanned Items (Ext. Links)", subzone.i, ia_data, "zi-")
                    subzone_details.appendChild(collections_details)
                }
            }
        }

        // -------- Periodicals, Collections, (Called below)
        function getZoneSidebarDetails(name, ids, data_source, item_id_prefix) {
            const sublist_details = quickNodeTag("details")
            const sublist_summary = quickNode("summary", name)
            const sublist_ul = quickNodeTag("ul")

            // Attach the elements
            sublist_details.appendChild(sublist_summary)
            sublist_details.appendChild(sublist_ul)

            // Loop the IDs
            for (let k=0, id_end=ids.length; k<id_end; k++) {
                const id = ids[k]
                const li_text = data_source[id].name

                if (item_id_prefix != "zi-") {
                    // Add the text, IDs, and click function
                    const sublist_li = quickNode("li", li_text)
                    sublist_li.setAttribute("id", item_id_prefix + id)
                    sublist_li.setAttribute("onclick", "hl(this)")
                    sublist_ul.appendChild(sublist_li)
                } else {
                    // IA items
                    const sublist_li = buildIAListItem(data_source[ id ])
                    sublist_ul.appendChild(sublist_li)
                }
            }

            return(sublist_details)

        }
    }
    document.getElementById("zones-list").appendChild(sidebar)
    update_loading_screen_new("Zones/Subzones completed.")
}




// ================================= UI FUNCTIONS (Clicking on the stacks, etc.)

function zoomOut() { 
    viewer.viewport.goHome()
}


// Creates an event listener for when the OSD canvas is clicked, double-clicked
function addClickHandlers() {

    viewer.addHandler('canvas-click', function processCanvasClick(event) {

        // event.quick=true prevents processing click+drag events
        if (event.quick) {

            // Convert event.position (px on browser window) to viewport coordinants (px on OSD viewer)
            var viewport_point = viewer.viewport.pointFromPixel(event.position)

            // Converts viewport point to {stack, bank, row} stacks location.
            // Return false if the click is outside a stack image.
            var stacks_loc = getLocationFromViewportPoint(viewport_point)

            if (stacks_loc != false) {
                // Highlights the clicked shelf (aqua)
                drawClickShelfHighlight([stacks_loc["stack"], stacks_loc["bank"], stacks_loc["row"]])

                // Get the stacks data and populate the "You Clicked" sidebar
                // stacks_data is stored in 3d array, indexes starting from zero.
                const clicked_data = stacks_data[stacks_loc["stack"]-1][stacks_loc["bank"]-1][stacks_loc["row"]-1];
                showClickInfo(stacks_loc, clicked_data)
            }
        }
    });     // End click handler

    // Double-click to zoom in
    viewer.addHandler('canvas-double-click', function processCanvasDoubleClick(event) {
        viewer.viewport.panTo( viewer.viewport.pointFromPixel(event.position) )
        viewer.viewport.zoomBy(3)
    });     // End double-click handler
    
}


/*
Translates the Viewport click location to {stack, bank, row} locations.
Note: stack-bank-row "Locations" start from 1, but these functions reference
various arrays in (e.g.) click_layout starting from 0. Hence the -1 conversions.
*/
function getLocationFromViewportPoint(vp) {

    // -------- Find stack; get the stack payout
    const click_stack = getStackFromViewportPoint(vp)
    if (click_stack == false) { reportInvalidClickLocation("stack"); return(false) }
    const click_layout = viewer.tileSources[click_stack-1].layout

    // -------- Find bank
    const click_bank = getBankFromViewportPoint(vp, click_layout)
    if (click_bank == false) { reportInvalidClickLocation("bank"); return(false) }

    // -------- Find row
    const click_row = getRowFromViewportPoint(vp, click_layout, viewer.tileSources[click_stack-1].y, click_stack, click_bank)
    if (click_row == false) { reportInvalidClickLocation("row"); return(false) }

    // Return as a location object
    return({"stack": click_stack, "bank": click_bank, "row": click_row})

    // Helper: reports why the invalidation happened.
    function reportInvalidClickLocation(found_at) {
        console.log("Invalid click location. Found while calculating:", found_at)
    }

    // Helper: Compares the click y to the layout[]'s y and stack_heights
    // Validation note: Weeds out clicks above and below stacks
    function getStackFromViewportPoint(vp) {
        for (let i=0; i<layout.total_stacks; i++) {
            const vts = viewer.tileSources[i]
            if (vp.y > vts.y && vp.y < (vts.y + vts.layout.stack_height)) {
                return(i+1)
            }
        }
        return(false)
    }   // End get stack.

    // Helper: Compares the click x to the bank widths
    // Validation note: Weeds out clicks beyond the L and R boundries of stacks.
    function getBankFromViewportPoint(vp, click_layout) {

        // Click is beyond the L or R boundries of the stack.
        if (vp.x < click_layout.x || vp.x > (click_layout.x + click_layout.stack_width)) {
            return(false)
        }

        // Uniform bank widths: Divide vp.x by the bank width and add one.
        if (click_layout.uniform_bank_width !== undefined) {
            return( Math.floor((vp.x - click_layout.x) / click_layout.uniform_bank_width) + 1 )

        // Non-uniform: Iterate the bank widths, checking against vp.x
        } else {
            let bank_running_total = click_layout.x
            for (let i=0, bw_end=click_layout.bank_widths.length; i<bw_end; i++) {
                if (vp.x > bank_running_total 
                    && vp.x < (bank_running_total + click_layout.bank_widths[i])) {
                        return(i+1)
                    }
                bank_running_total += click_layout.bank_widths[i]
            }

            return(false)   // For satefy. This should never be reached.
        }
    }   // End get bank

    // Helper: Gets the row by starting at the stack's full height and decrementing row heights.
    // Recall that subtracting Y is "moving up" in canvas pixels: Hence we start at the bottom.
    function getRowFromViewportPoint(vp, click_layout, stack_y, click_stack, click_bank) {
        const shelf_heights = selectShelfHeightsArray(click_layout, click_stack, click_bank)
        let y_running_total = stack_y + click_layout.stack_height
        for (let i=0, sh_end=shelf_heights.length; i<sh_end; i++) {
            y_running_total -= shelf_heights[i]
            if (vp.y > y_running_total) return(i+1)
        }

        return(false)   // For satefy. This should never be reached.

        // Helper: Checks if stack/bank location has non-standard shelf heights,
        // returns the appropriate standard/nonstandard shelf heights array.
        function selectShelfHeightsArray(click_layout, click_stack, click_bank) {
            if (click_layout.multiple_shelf_heights !== undefined
                && click_layout.multiple_shelf_heights[click_stack] !== undefined
                && click_layout.multiple_shelf_heights[click_stack][click_bank] !== undefined) {
                return(click_layout.multiple_shelf_heights[click_stack][click_bank])
            } else {
                return(click_layout.shelf_heights)
            }
        }
    }   // End get row.
}


/* Displays the clicked data in the sidebar. Input Format:
    clicked_data: {
        'zones': [ [z#,s#], [z#,s#]... ]  -- Index 0 is the "primary zone"
        't': [] (topics array)
        'p': [] (periodicals, array of indexes)
        'c': [] (special collections, array of indexes)
    } */
function showClickInfo(stacks_loc, clicked_data) {

    // Fragment will eventually replace #clicked-info div
    const clicked_info_fragment = new DocumentFragment()

    try {
        // ---------- Zone data (zone name, subzone name)
        // NOTE: clicked_data.z and .s are array indexes, e.g. starting from zero
        // NOTE: z_index, s_index are the first zone. Additional zones are listed 
        //       in "other material here" (see below)
        const z_index = clicked_data.zones[0][0]
        const s_index = clicked_data.zones[0][1]

        // Zone
        const zone_h4 = quickNode("h4", "ZONE:")
        const zone_p = quickNode("p", zones_data[ z_index ].name)
        clicked_info_fragment.appendChild(zone_h4)
        clicked_info_fragment.appendChild(zone_p)

        // Subzone (Not needed for Ephemera, Therkelson, or Flat file.)
        if (z_index < 15) {
            const subzone_h4 = quickNode("h4", "SUBZONE:")
            const subzone_p = quickNode("p", zones_data[ z_index ]["sub"][ s_index ].name)
            clicked_info_fragment.appendChild(subzone_h4)
            clicked_info_fragment.appendChild(subzone_p)
        }

        // Some locations (e.g. Ephemera and Oversize) can have multiple zones
        if (clicked_data.zones.length > 1) {
            const other_h4 = quickNode("h4", "OTHER MATERIAL HERE:")
            const other_ul = quickNodeTag("ul")

            for (let zone_index = 1, zi_end=clicked_data.zones.length; zone_index < zi_end; zone_index++) {
                const c_zone = clicked_data.zones[zone_index]
                const other_li = quickNode("li", (
                    zones_data[ c_zone[0] ].name + " >> "
                    + zones_data[ c_zone[0] ]["sub"][ c_zone[1] ].name))
                other_ul.appendChild(other_li)
            }

            clicked_info_fragment.appendChild(other_h4)
            clicked_info_fragment.appendChild(other_ul)
        }

        // ---------- Periodicals, Special Collections, Scanned items
        if (clicked_data.p != undefined) addClickedSublist("PERIODICALS (SHELF):", clicked_data.p, periodicals_data)
        if (clicked_data.c != undefined) addClickedSublist("COLLECTIONS (SHELF):", clicked_data.c, sc_data)
        // Returns false is no scanned items are associated with zones/subzones in the array
        clicked_ia_indexes = getClickedIAIndex(clicked_data.zones)
        if (clicked_ia_indexes != false) addClickedIASublist("SCANNED ITEMS (EXT. LINKS):", clicked_ia_indexes, ia_data)

    } catch (error) {
        clicked_info_fragment.appendChild(quickNode("h4", "WHOOPS! DATA ERROR :P"))
        clicked_info_fragment.appendChild(quickNode("p", 
            "The site's still working fine, just click on a different shelf. Sorry, my bad!! --Devin "))
        console.log(error)
    }

    // Get the div for displaying click info, and clear it.
    document.getElementById("clicked-info").replaceChildren(clicked_info_fragment)

    // ---------- Helper function for Periodicals, Collections, and IA.
    function addClickedSublist(list_title, ids, data_source) {
        let names = [ids.length]
        for (let i=0, ids_end=ids.length; i<ids_end; i++) {
            names[i] = data_source[ ids[i] ].name
        }
        const list_elements = buildClickedInfoList(list_title, names)
        clicked_info_fragment.appendChild(list_elements[0])
        clicked_info_fragment.appendChild(list_elements[1])
    }

    // ----------  Helper function for building ULs with H4 headers.
    function buildClickedInfoList(list_title, list_items) {
        const list_h4 = quickNode("h4", list_title)
        const list_ul = quickNodeTag("ul")
        for (let i=0, li_end=list_items.length; i<li_end; i++) {
            list_ul.appendChild(quickNode("li", list_items[i]))
        }
        return( [list_h4, list_ul] )
    }

    // ---------- Loops the clicked zones, creates a set of IA indexes
    function getClickedIAIndex(click_zones) {
        let ia_indexes = new Set()
        for (let i=0, i_end=click_zones.length; i<i_end; i++) {
            const z = click_zones[i][0]
            const s = click_zones[i][1]
            const zones_item = zones_data[z].sub[s]
            if (zones_item.hasOwnProperty('i')) {
                for (let j=0, j_end=zones_item.i.length; j<j_end; j++) {
                    ia_indexes.add(zones_item.i[j])
                }
            }
        }
        if (ia_indexes.size == 0) {
            return(false)
        } else {
            return(Array.from(ia_indexes).sort())
        }
    }

    // ---------- Helper for scanned links: Slightly different workflow for the urls
    function addClickedIASublist(list_title, ids, data_source) {
        const list_h4 = quickNode("h4", list_title)
        const list_ul = quickNodeTag("ul")
        for (let i=0, ids_end=ids.length; i<ids_end; i++) {
            list_ul.appendChild( buildIAListItem(data_source[ ids[i] ]) )
        }
        clicked_info_fragment.appendChild(list_h4)
        clicked_info_fragment.appendChild(list_ul)
    }

}


// Retriggers non-infinite animations
// Requires async wait() to trigger browser redraw for class to re-add after removal 
async function retriggerAnimation(elem_id, anim_class_name) {
    const elem = gid(elem_id)
    elem.classList.remove(anim_class_name)
    await sleep(1);
    elem.classList.add(anim_class_name)

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}


// Draws the highlight around the clicked shelf.
function drawClickShelfHighlight(loc) {
    // Retriggers blue text flash
    if (ui_vars.list_view == false) {
        retriggerAnimation("menu-div", "click_h2_animation")
    }

    // Returns an object {x,y,width,height}
    const viewer_pos = calcViewerHighlight(loc, false)
    
    // Clear the existing click highlight
    const existing_stack_hl = gid("click_shelf_hl")
    if (existing_stack_hl != null) {
        viewer.removeOverlay(existing_stack_hl)
    }

    // Create the elements for the viewer hilight
    const e = document.createElement("div")
    e.id = "click_shelf_hl"

    // Add the viewer overlay object
    viewer.addOverlay({
        element: e,
        location: new OpenSeadragon.Rect(
            viewer_pos.x,
            viewer_pos.y,
            viewer_pos.width,
            viewer_pos.height
        )
    });

}




// ==================================== HIGHLIGHT FUNCTIONS

// Removes all hilights
function clearAllHighlights() {
    viewer.clearOverlays()
    const text_highlights_to_clear = Array.from(document.querySelectorAll(".text-hl1,.text-hl2"))
    for (let i=0, i_end=text_highlights_to_clear.length;i<i_end; i++) {
        text_highlights_to_clear[i].classList.remove("text-hl1", "text-hl2")
    }
}


// Called when a sidebar item is clicked. Acts as a toggle.
// Note: Two CSS classes are used (text-hl1, text-hl2) for different colors
//       depending on an item's nesting in the sidebar lists.
function hl(element) {

    // If the element is already highlighted, clear the HLs.
    if (element.classList.contains("text-hl1") || element.classList.contains("text-hl2")) {
        element.classList.remove("text-hl1", "text-hl2")
        clearSelectedHighlights(element.id)

        // If hl() was called from the zone/subzone list, clear its nested items also.
        const e_type = element.id.split("-")[0]
        if (e_type == 'z' || e_type =='s') clearAndCloseNestedElements(element, true)

    // Otherwise, process the element and draw the highlights.
    } else {
        processElementForHighlighting(element)
    }
}


// Removes specified highlights
function clearSelectedHighlights(removal_class) {
    const overlay_divs_to_clear = Array.from(document.getElementsByClassName(removal_class))
    for (let i=0, i_end=overlay_divs_to_clear.length;i<i_end; i++) {
        viewer.removeOverlay(overlay_divs_to_clear[i])
    }
}


// Called from the sidebar lists
// parentNode.open=true if the element was open when clicked.
function closeNested(element, zones_subzones_element) {
    if (element.parentNode.open) clearAndCloseNestedElements(element, zones_subzones_element)
}


// Processes an element's children
function clearAndCloseNestedElements(element, zones_subzones_element) {
    // Clear highlighted sub-elements
    const nested_elements_to_clear = Array.from(element.parentNode.querySelectorAll(".text-hl1,.text-hl2"))
    for (let i=0, i_end=nested_elements_to_clear.length;i<i_end;i++) {
        nested_elements_to_clear[i].classList.remove("text-hl1", "text-hl2")
        clearSelectedHighlights(nested_elements_to_clear[i].id)
    }

    // Close the nested <details> in the zones
    if (zones_subzones_element != null) {
        const nested_details = Array.from(element.parentNode.getElementsByTagName("details"))
        for (let i=0, i_end=nested_details.length;i<i_end;i++) {
            nested_details[i].removeAttribute("open")
        }
    }
}


// Figures out the locations to highlight and kinds of highlights to draw.
function processElementForHighlighting(element) {
    // Locations needing to be highlighted will be appended to this array.
    let locations = []

    // ID = letter(s) - number (optional: -number)
    const id_split = element.id.split("-")
    const type = id_split[0]
    const index = parseInt(id_split[1])

    // Add class to clicked element
    switch(type) {
        case("z"):      // Zones
            zoomOut()
            element.classList.add("text-hl1")
            const zone = zones_data[index]
            let zone_locs = new Set()
            for (let i=0, sz_end=zone.sub.length; i<sz_end; i++) {
                zone.sub[i].locs.forEach(item => zone_locs.add([item[0],item[1],[0]]))
            }
            locations = Array.from(zone_locs)
            break;

        case("s"):      // Zones > Subzones
            zoomOut()
            element.classList.add("text-hl1")
            subzone_index = parseInt(id_split[2])
            locations = zones_data[index].sub[subzone_index].locs
            break;

        case("zp"):     // Zones > Subzones > Periodcals
            element.classList.add("text-hl2")
            locations = periodicals_data[index].locs
            break;

        case("zc"):     // Zones > Subzones > Special Col.
            element.classList.add("text-hl2")
            locations = sc_data[index].locs
            break;

        case("p"):      // Periodicals from their own list
            zoomOut()
            element.classList.add("text-hl1")
            locations = periodicals_data[index].locs
            break;
        
        case("c"):      // Special Cols. from their own list
            zoomOut()
            element.classList.add("text-hl1")
            locations = sc_data[index].locs
            break;
    }
    drawHighlights(type, locations, element.id)
}


// Adds a hilight from the passed location
function drawHighlights(type, locations, id_for_class) {
    for (let i=0, l_end=locations.length; i<l_end; i++) {
        const loc = locations[i]

        // Some differences in position calcs and classes
        is_zone = (type == "z")? true : false

        // Returns: {x, y, width, height}
        viewer_pos = calcViewerHighlight(loc, is_zone)

        // Create the elements for the viewer hilight
        let e = document.createElement("div")
        switch(type) {
            case("z"):
                e.classList.add("zone-top-hl", id_for_class)
                break;
            case("zp"):
            case("zc"):
                e.classList.add("hl2", id_for_class)
                // Adjust viewer_pos for nested highlights
                viewer_pos.x += 2
                viewer_pos.y += 2
                viewer_pos.width -= 4
                viewer_pos.height -= 4
                break;
            default:
                e.classList.add("hl", id_for_class)
                break;
        }

        // Add the viewer overlay object
        viewer.addOverlay({
            element: e,
            location: new OpenSeadragon.Rect(
                viewer_pos.x,
                viewer_pos.y,
                viewer_pos.width,
                viewer_pos.height
            )
        });

    }
}


// Calculates the position and size of the highlight rectangle.
// Takes a location array [stack, bank, row], is_zone = boolean
// Returns {x, y, width, height} for the hilighting box
function calcViewerHighlight(loc, is_zone) {

    // Get the stack layout, and x, y components
    const hl_layout = viewer.tileSources[loc[0]-1].layout
    let x_components = getHighlightXComponents(loc, hl_layout)
    let y_components = getHighlightYComponents(loc, hl_layout, is_zone)

    //  -- 4px adjustment for css 2px border width
    return({
        "x": x_components.x,
        "y": y_components.y,
        "width": x_components.width,
        "height": y_components.height - 4
    })
}


// Calculates the x position and width of the highlight, returns {x, width}
// Note: The viewer's TileSources include the left-side x offset
function getHighlightXComponents(loc, hl_layout) {

    // Uniform bank widths can be multiplied by the bank number
    if (hl_layout.uniform_bank_width !== undefined) {
        return({
            x:((hl_layout.uniform_bank_width * (loc[1]-1)) + hl_layout.x),
            width: hl_layout.uniform_bank_width
        })

    // Non-uniform bank widths (ephemera, flat file) require aggregating previous widths
    } else {
        return({
            x: (addBankWidths(loc[1]-1, hl_layout.bank_widths) + hl_layout.x),
            width: hl_layout.bank_widths[loc[1]-1]
        })
    }

    // Helper: Adds bank widths prior to the passed bank
    function addBankWidths(bank_number, width_array) {
        let bank_x = 0;
        for (let i=0; i<bank_number; i++) {
            bank_x += width_array[i]
        }
        return(bank_x)
    }

}


// Calculates the y position and height of the highlight, returns {y, height}
// Note: In canvas space: adding = moving downward, subtracting = moving upward.
function getHighlightYComponents(loc, hl_layout, is_zone) {

    // Select the correct shelf_heights array
    const hl_shelf_heights = selectShelfHeightsArray(loc, hl_layout)

    // Calculate the y position by adding shelf heights and spacers.
    let y = 0;
    for (let i=0, i_end=loc[0]-1; i< i_end; i++) {
        y += viewer.tileSources[i].layout.stack_height + layout.stack_y_spacer
    }

    // Zone highlights sit atop the banks, with a height of zero.
    if (is_zone) {
        y -= layout.zone_highlight_offset
        return({y:y, height:0})

    // Subzone highlights start at the bottom of the stack, then move upward (subtract shelf heights)
    } else {
        y += hl_layout.stack_height
        y -= getPreceedingShelfHeights(hl_shelf_heights, loc[2])
    }

    // Done!
    return({y: y, height: (hl_shelf_heights[loc[2]-1])})

    // Helper: Returns a single shelf_heights array if multiple are present
    function selectShelfHeightsArray(loc, hl_layout) {
        if (hl_layout.multiple_shelf_heights !== undefined
            && hl_layout.multiple_shelf_heights[loc[0]] !== undefined
            && hl_layout.multiple_shelf_heights[loc[0]][loc[1]] !== undefined) {
                return(hl_layout.multiple_shelf_heights[loc[0]][loc[1]])
        } else {
            return(hl_layout.shelf_heights)
        }
    }

    // Helper: Returns the combined heights of shelves preceeding a certain shelf.
    function getPreceedingShelfHeights(shelf_height_array, shelf_position) {
        let running_total = 0
        for (let i=0; i<shelf_position; i++) {
            running_total += shelf_height_array[i]
        }
        return(running_total)
    }
}




// ============================================= MISC. SHORTCUTS & HELPER FUNCTIONS

// Short alias for docment.getElementById()
function gid(id) {
    return(document.getElementById(id))
}


// Returns numerals as strings with preceeding zeros
function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}


// Returns a new node with the given tag
function quickNodeTag(tag) {
    return(document.createElement(tag))
}


// Returns a new node with the given tag and a single text child
function quickNode(tag, text) {
    const e = document.createElement(tag)
    e.textContent = text
    return(e)
}


// Update loading screen
function update_loading_screen_new(message) {
    gid("loadingUL").appendChild(quickNode("li", message))
}


// Opens the sidebar menu
function openMenu() {
    gid("menu-div").style.display = "block";
    gid("clicked-div").open = true;
    gid("show-menu-button").style.display = "none";
}


// Sidebar button: closes all details
function closeAllDetails() {
    // Close all the nested tags & un-color them
    const details_to_close = Array.from(document.querySelectorAll("details"))
    for (let i=0, i_end=details_to_close.length; i<i_end; i++) {
        details_to_close[i].removeAttribute("open")
    }
    clearAllHighlights()
}


// Returns an li node with a link to the IA item
function buildIAListItem(ia_item) {
    const li = document.createElement("li")
    const a = document.createElement("a")
    a.innerHTML = ia_item.name

    // Date
    if (ia_item.date != "") a.innerHTML += " (" + ia_item.date + ") "

    // URLs starting with ! indicates a collection
    if (ia_item.url.charAt(0) == '!') {
        a.href = "https://archive.org/details/prelinger_library?tab=collection&query=" + ia_item.url.substring(1)
        a.innerHTML += '<span class=c>&#9903;</span> '
    } else {
        a.href = "https://archive.org/details/" + ia_item.url + "/mode/thumb?view=theater"
    }

    // GovDoc
    if (ia_item.hasOwnProperty('g')) {
        a.innerHTML += '<span class=g>&#9881;</span> '
    }

    // Illustration level diamonds
    if (ia_item.hasOwnProperty('il')) {
        let il_text = '<span class=il>'
        for (let i=0; i<ia_item.il; i++) il_text += '&#9830;'
        il_text += '</span>'
        a.innerHTML += il_text
    }

    a.setAttribute("target", "_blank")
    li.appendChild(a)

    return(li)
}


// Toggles the sidebar menu open/closed
function toggleMenu() {
    const menu_div = gid("menu-container");
    const show_menu_button = gid("show-menu-button")

    if (ui_vars.vertical_mode == false) {
        const r_handle = gid("resize-handle")

        if (ui_vars.menu_open) {
            menu_div.style.display = "none";
            r_handle.style.display = "none"
            show_menu_button.style.display = "block";
        } else {
            menu_div.style.display = "block";
            r_handle.style.display = "block"
            show_menu_button.style.display = "none";
        }

    } else {

        if (ui_vars.menu_open) {
            menu_div.style.display = "none";
            show_menu_button.style.display = "block";
        } else {
            menu_div.style.display = "block";
            show_menu_button.style.display = "none";
        }

    }

    ui_vars.menu_open = !ui_vars.menu_open

}


// Switches between click view and list view
function toggleListView() {
    const clicked_div = gid("clicked-div")
    const list_div_ids = ["zones-div", "periodicals-div", "sc-div", "ia-div"]
    const list_view_button = gid("list-view-button")

    if (ui_vars.list_view) {
        clicked_div.style.display = "block"
        for (let i=0, i_end=list_div_ids.length; i<i_end; i++) {
            let list_div = gid(list_div_ids[i])
            list_div.style.display = "none"
        }
        list_view_button.innerText = "SHOW LISTS"
    } else {
        clicked_div.style.display = "none"
        for (let i=0, i_end=list_div_ids.length; i<i_end; i++) {
            let list_div = gid(list_div_ids[i])
            list_div.style.display = "block"
        }
        list_view_button.innerText = "SHOW CLICKED"
    }

    ui_vars.list_view = !ui_vars.list_view

}


// Resets the position of the resize handles.
// Called when the handles are doubleclicked,
// or the window switches from horizontal to vertical mode.
function r_handle_reset() {
    gid("resize-handle").style.left = "20em"
    gid("menu-container").style.width = "20em"
}


// Random gradient code stolen from here:
// https://codepen.io/Luc-Designs/pen/LXxBPg
function randomBackgroundGradient() {
    // Returns a random hex value
    function createHex() {
        let hexCode = ""
        const hexValues = "0123456789abcdef"
        for (let i = 0; i < 6; i++ ) {
            hexCode += hexValues.charAt( Math.floor(Math.random() * 15));
        }
        return(hexCode)
    }

    const deg = Math.floor(Math.random() * 360)
    const gradient = (
        "linear-gradient("
        + "#" + createHex() + ", "
        + "#" + createHex() + ")"
    )

    console.log(gradient)
    document.body.style.background = gradient

}