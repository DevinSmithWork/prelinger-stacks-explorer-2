# Photo and Data Prep

## Photo Prep: Processing/Java
This is a [Processing Java](http://processing.org) program. It was written with v.4.1, but should be backward compatible to 3 (and probably 2).

### Usage
- Open prelinger_photo_setup.pde in the Processing IDE, and run the sketch.
- It'll ask you to select a folder containing the image files (jpg by default).
- Click on the image to place 4 points, which will become the corners of the processed image. Start in the upper-left corner and work clockwise.
- The processed image will export into output/. Click to load the next image.

### Notes on speeding up image loading
This program is a simplified version, demonstrating the expected flow, and especially how the lerp() function is used to manipulate the photos. However, working in a real-world setting with larget .tif files, the load times between images can slow the workflow down significantly. In the (embarrasingly messy) version I used for this project, I rigged up a system which loaded the next photo in a separate thread, so it would be ready to draw ASAP. 

## Data Prep
