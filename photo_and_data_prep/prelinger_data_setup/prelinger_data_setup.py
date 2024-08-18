# =============================
# Input:
#   stacks.csv
#   ia.csv
#   zones-subzones.json
#
# Output:
#   library_nested.json
#   zones_subzones.json
#   periodicals.json
#   special_collections.json
#	ia.json
# =============================

import os
import csv
import json
from datetime import datetime

stacks_file = "input/stacks_2024-07-20.csv"
ia_file = "input/ia_2024-07-20.csv"
zones_subzones_file = "input/zones-subzones.json"


def main():

    # Create output dir
    output_dir = "output/" + datetime.today().strftime('%Y-%m-%d_%H-%M-%S')
    os.mkdir(output_dir)

    # Load stacks data
    stacks_linear = create_stacks_linear(stacks_file)

    # Create indexes for Periodicals, Special Collections
    periodical_index = create_periodical_indexes(stacks_linear)
    sc_index = create_sc_indexes(stacks_linear)

    # Prep stacks data:
    #   - Format location array
    #   - Split Zones text into an array of arrays
    #   - Replace periodicals and sp. col. text with index numbers
    stacks_linear = prep_stacks_data(stacks_linear, periodical_index, sc_index)

    # Converts text lists to list of dicts & Adds the stacks data locations
    #    - '^' --> ', ' for the periodicals happens here.
    #    - These files are now done. Export.
    periodical_data = prep_periodical_data(stacks_linear, periodical_index)
    export_json_file(periodical_data, "periodicals.json", output_dir)

    sc_data = prep_sc_data(stacks_linear, sc_index)
    export_json_file(sc_data, "special_collections.json", output_dir)

    # Load IA data; prep; export
    ia_data = create_ia_data(ia_file)
    ia_data = prep_ia_data(ia_data)
    export_json_file(ia_data, "ia.json", output_dir)

    # Add the IA indexes to the stacks data
    export_json_file(stacks_linear, "stacks_linear.json", output_dir)
    stacks_linear = add_ia_data_to_stacks(stacks_linear, ia_data)
    export_json_file(stacks_linear, "stacks_linear_with_ia_indexes.json", output_dir)

    # Load and prep the zones-subzones files
    zs_data = create_zs_data(zones_subzones_file)
    zs_data = prep_zs_data(zs_data, stacks_linear, ia_data, periodical_data)
    export_json_file(zs_data, "zones_subzones.json", output_dir)

    # Nest the linear stacks
    stacks_nested = nest_stacks_data(stacks_linear)
    export_json_file(stacks_nested, "library_nested.json", output_dir)


def create_stacks_linear(stacks_file):
    with open(stacks_file, 'r') as f:
        return [row for row in csv.DictReader(f)]


def create_periodical_indexes(stacks_linear):
    periodical_index = set()
    for i in stacks_linear:
        if not (i["Periodicals"] is None or i["Periodicals"] == ''):
            periodical_index.update(i["Periodicals"].split(", "))
    periodical_index = sorted(periodical_index)
    if '' in periodical_index:
        periodical_index.remove('')

    return periodical_index


def create_sc_indexes(stacks_linear):
    sc_index = set()
    for i in stacks_linear:
        if not (i["Special Collection"] is None or i["Special Collection"] == ''):
            sc_index.update(i["Special Collection"].split(", "))
    sc_index = sorted(sc_index)
    if '' in sc_index:
        sc_index.remove('')

    return sc_index


def prep_stacks_data(stacks_linear, periodical_index, sc_index):
    clean_stacks_linear = []
    for i in stacks_linear:

        # Location array
        loc_array = [int(i['Stack']),
                     int(i['Bank']),
                     int(i['Row'])]

        # Zones can contain multiple entries
        # TK some zones in stack 6 have no subzones. Intentional?
        zones_split = i['Zones'].split(',')
        zones_array = []
        for z in zones_split:
            z = z.split('.')
            if len(z) > 1:
                zones_array.append([int(z[0]), int(z[1])])
            else:
                zones_array.append([int(z[0]), 0])

        # Create the new clean dict
        clean_stacks_item = {
            'loc': loc_array,
            'zones': zones_array
        }

        # Loop the Periodicals, replace with indexes.
        if not (i['Periodicals'] is None or i['Periodicals'] == ''):
            periodical_array = i['Periodicals'].split(', ')
            periodical_array = [periodical_index.index(p) for p in periodical_array if p != '']
            clean_stacks_item['p'] = periodical_array

        # Loop the sc, replace with indexes.
        if not (i['Special Collection'] is None or i['Special Collection'] == ''):
            sc_array = i['Special Collection'].split(', ')
            sc_array = [sc_index.index(sc) for sc in sc_array if sc != '']
            clean_stacks_item['c'] = sc_array

        clean_stacks_linear.append(clean_stacks_item)

    return clean_stacks_linear


def prep_periodical_data(stacks_linear, periodical_index):
    periodical_index = [{'name': i.replace('^', ', '), 'locs': []} for i in periodical_index]
    for stacks_item in stacks_linear:
        if 'p' in stacks_item.keys():
            for p_index in stacks_item['p']:
                periodical_index[p_index]['locs'].append(stacks_item['loc'])

    return periodical_index


def prep_sc_data(stacks_linear, sc_index):
    sc_index = [{'name': i, 'locs': []} for i in sc_index]
    for stacks_item in stacks_linear:
        if 'c' in stacks_item.keys():
            for c_index in stacks_item['c']:
                sc_index[c_index]['locs'].append(stacks_item['loc'])

    return sc_index


def create_ia_data(ia_file):
    with open(ia_file, 'r') as f:
        return [row for row in csv.DictReader(f)]


def prep_ia_data(ia_data):
    clean_ia_data = []

    for i in ia_data:
        # Zones can contain multiple entries
        # TK some zones in stack 6 have no subzones. Intentional?
        zones_split = i['Zones'].split(',')
        zones_array = []
        for z in zones_split:
            z = z.split('.')
            if len(z) > 1:
                zones_array.append([int(z[0]), int(z[1])])
            else:
                zones_array.append([int(z[0]), 0])

        # Create the new dict
        clean_item = {
            'name': i['Title'],
            'date': i['Date'],
            'zones': zones_array
        }

        # Add the values used to construct URLs in javascript.
        # A different URL format is used for collections.
        if i['Collection'] == 'x':
            clean_item['url'] = '!' + i['URL'].split("&query=")[1]
        else:
            clean_item['url'] = i['IA ID']

        # Add illustration level if it's there.
        if not (i['Illustration Level'] is None or i['Illustration Level'] == ''):
            if i['Illustration Level'] == 'Light':
                clean_item['il'] = 1
            elif i['Illustration Level'] == 'Medium':
                clean_item['il'] = 2
            else:
                clean_item['il'] = 3

        clean_ia_data.append(clean_item)

    return clean_ia_data


def add_ia_data_to_stacks(stacks_linear, ia_data):
    # Loop the stacks & IA data; Find matching zones;
    # Add the ia_index to the stacks data object.

    for stacks_item in stacks_linear:
        ia_index_set = set()

        for ia_index, ia_item in enumerate(ia_data, 0):

            # Loop each of the stack zones
            for stacks_zone in stacks_item['zones']:

                # If the current stack zone is in an ia zone list, add it to the set.
                if stacks_zone in ia_item['zones']:
                    ia_index_set.add(ia_index)

        if len(ia_index_set) > 0:
            stacks_item['i'] = sorted(ia_index_set)

    return stacks_linear


def create_zs_data(zs_file):
    with open(zs_file, 'r') as f:
        zs_data = json.load(f)

    return zs_data


def prep_zs_data(zs_data, stacks_linear, ia_data, periodical_data):

    # Convert nested subzone strings into objects with empty loc arrays.
    # Note! Subzone loc arrays can't be done with a set, bc each individual item gets added.
    for zone in zs_data:
        zone['sub'] = [{'name': subzone_name,
                        'i': set(),
                        'p': set(),
                        'c': set(),
                        'locs': []
                        } for subzone_name in zone['sub']]

    # Add the ia_data from ia_data zone keys
    for ia_index, ia_item in enumerate(ia_data):
        for ia_zone_arr in ia_item['zones']:
            z = ia_zone_arr[0]
            s = ia_zone_arr[1]
            zs_data[z]['sub'][s]['i'].add(ia_index)

    # Loop stacks, adding location arrays
    for stacks_item in stacks_linear:

        # Zones indexes for adding data
        for index, stacks_item_zone in enumerate(stacks_item['zones'], 0):
            z = int(stacks_item_zone[0])
            s = int(stacks_item_zone[1])

            # Only shelving periodicals & collections into the FIRST zone.
            if index == 0:
                if 'p' in stacks_item.keys():
                    print(f'Periodical: {stacks_item['p']} :: Shelving into:{z}.{s}')
                    zs_data[z]['sub'][s]['p'].update(stacks_item['p'])

                if 'c' in stacks_item.keys():
                    print(f'Collection: {stacks_item['c']} :: Shelving into:{z}.{s}')
                    zs_data[z]['sub'][s]['c'].update(stacks_item['c'])

            # Add loc array to the subzone if it's not there already
            if stacks_item['loc'] not in zs_data[z]['sub'][s]['locs']:
                zs_data[z]['sub'][s]['locs'].append(stacks_item['loc'])

    # Cleanup and convert the sets to arrays.
    cleanup_keys = ['i', 'p', 'c']
    for key in cleanup_keys:
        for zone in zs_data:
            for subzone in zone['sub']:
                if len(subzone[key]) == 0:
                    del subzone[key]
                else:
                    subzone[key] = sorted(subzone[key])

    return zs_data


def nest_stacks_data(stacks_linear):

    # returns the larger of two numbers
    def return_max(a, b):
        return a if a > b else b

    # Find the maxes for the library
    max_stack, max_bank, max_row = 0, 0, 0
    for item in stacks_linear:

        # TK remove this if it breaks everything
        if 'i' in item.keys():
            del item['i']

        max_stack = return_max(max_stack, item['loc'][0])
        max_bank = return_max(max_bank, item['loc'][1])
        max_row = return_max(max_row, item['loc'][2])

    # Slightly awkward syntax for creating an empty 3D list with known dimensions.
    # Note: The unused "None" items are removed later.
    stacks_nested = []
    for s in range(max_stack):
        stack_arr = []
        for b in range(max_bank):
            bank_arr = []
            for r in range(max_row):
                bank_arr.append(None)
            stack_arr.append(bank_arr)
        stacks_nested.append(stack_arr)

    # Loop the linear dicts
    for item in stacks_linear:
        # nesting positions are array indexes, e.g. starting from 0;
        # delete the loc array; slot into nested structure
        nest_loc = [i - 1 for i in item['loc']]
        del item['loc']
        stacks_nested[nest_loc[0]][nest_loc[1]][nest_loc[2]] = item

    # Strip out empty items
    for s in range(max_stack):
        for b in range(max_bank):
            stacks_nested[s][b] = [r for r in stacks_nested[s][b] if r is not None]
        stacks_nested[s] = [b for b in stacks_nested[s] if b != []]

    # return
    return stacks_nested


# ---- Export functions
def export_json_file(data, filename, output_dir):
    with open(output_dir + "/" + filename, 'w') as f:
        json.dump(data, f)


if __name__ == '__main__':
    main()
