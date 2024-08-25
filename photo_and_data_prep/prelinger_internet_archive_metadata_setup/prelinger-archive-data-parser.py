import xml.etree.ElementTree as ET
import os
import csv

# Dir w/ IA XML files
prelinger_dir = os.path.join(os.getcwd(), "input/")

# XML tags to include
single_node_tags = ["title", "creator", "publisher", "date", "identifier-access", "identifier"]
multi_node_tags = ["subject", "collection"]

# List for processed items
metadata_dicts = []

# Loop the files in the input dir
for filename in os.listdir(prelinger_dir):

	# For more robust control over (e.g.) skipping file system stuff, see glob.glob()
	if ".DS_Store" in filename:
		continue

	with open(os.path.join(prelinger_dir, filename), 'r') as xml_file: # open in readonly mode

		# Load the XML into an ETree
		tree = ET.parse(xml_file)
		root = tree.getroot()

		single_dict = {}

		# For single nodes, grab the tag value if it exists, otherwise use an empty string
		for tag in single_node_tags:
			single_node = root.find("./" + tag)
			single_dict[tag] = single_node.text if single_node is not None else ""

		# Multiple node tags require some nesting
		for tag in multi_node_tags:
			if tag != "collection":
				merged_nodes = ", ".join([elem.text for elem in root.findall("./" + tag)])
				single_dict[tag] = merged_nodes

			else:
				text_array = [elem.text for elem in root.findall("./" + tag)
					if elem.text != "prelinger_library"
						and elem.text != "additional_collections"
						and elem.text != "americana"
					]
				if len(text_array) > 0:
					single_dict[tag] = ", ".join(text_array)
				else:
					single_dict[tag] = ""

		metadata_dicts.append(single_dict)

# Export the dict to CSV
csv_fields = metadata_dicts[0].keys()
with open('prelinger_library_ia_items.csv', 'w') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=csv_fields)
    writer.writeheader()
    writer.writerows(metadata_dicts)
