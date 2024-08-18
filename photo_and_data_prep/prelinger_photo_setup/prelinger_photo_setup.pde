// Input and output
String input_image_extension = ".jpg";
String output_dir = "output";

// Final image dimensions & lerp quality
int export_width = 1000;
float export_ratio = 4.0 / 3.0;
int export_height = int(export_width / export_ratio);

// Basically a "quality" setting for the image mapping
int lerp_steps = 1028;

// Input files list, image object
ArrayList<File> input_files = null;
img_class image_processor = null;



// ====================
void setup() {
  size(900, 600, P2D);

  textSize(30);
  textAlign(CENTER);
  ellipseMode(CENTER);

  noLoop();
  selectFolder("Select a folder to process:", "get_input_files");
}



// ====================
void draw() {

  // input_files populates in the selectFolder callback
  if (input_files != null) {

    // Empty i_p object means it's time to load a new file.
    if (image_processor == null) {

      // If you got a next image, load it.
      if (input_files.size() != 0) {
        File image_to_load = input_files.remove(0);
        image_processor = new img_class(image_to_load);
      } else {
        print("All images processed. Exiting.");
        exit();
      }
    }

    // Draw the image and points.
    background(0);
    image_processor.draw_image();
    image_processor.draw_points();

    // Four points: Process and export the image.
    if (image_processor.points.size() == 4) {
      fill(255);
      text("4 points added: Exporting image. Click to load next.", width/2, height/2);
      image_processor.export_image();
    }
  }
}



// ====================
void get_input_files(File selection) {
  ArrayList<File> image_files_only = new ArrayList<File>();

  if (selection == null) {
    println("User cancled or closed window. Exiting.");
    exit();
  }

  // Loop the files, ignore anything that's not an immage.
  File[] file_list = selection.listFiles();
  for (int i=0; i< file_list.length; i++) {
    if (file_list[i].getName().indexOf(input_image_extension) != -1) {
      image_files_only.add(file_list[i]);
    }
  }

  println("Image files found:");
  println(image_files_only);

  input_files = image_files_only;
  redraw();
}



// ====================
void mouseClicked() {
  if (image_processor.points.size() < 4) {
    image_processor.points.add(new point(mouseX, mouseY));
  } else {
    image_processor = null;
  }
  redraw();
}
