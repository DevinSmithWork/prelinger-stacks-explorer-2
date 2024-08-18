// ====================
class point {
  float x, y;

  point(int px, int py) {
    x = px;
    y = py;
  }

  void scale_point(float s) {
    x = x*s;
    y = y*s;
  }
}



// ====================
class shape_texture_point {
  float shape_x, shape_y, tex_x, tex_y;

  shape_texture_point(float sx, float sy, float tx, float ty) {
    shape_x = sx;
    shape_y = sy;
    tex_x = tx;
    tex_y = ty;
  }
}



// ====================
class img_class {
  PImage image;
  ArrayList<point> points = new ArrayList<point>();
  Float display_scale;
  String file_name;

  img_class(File f) {
    file_name = f.getName();
    print("Loading image file:", file_name);
    image = loadImage(f.getAbsolutePath());
    display_scale = float(image.width)/float(width);
  }

  void draw_image() {
    image(image, 0, 0, image.width/display_scale, image.height/display_scale);
  }

  void draw_points() {
    stroke(255);
    fill(255);
    for (byte i=0; i<points.size(); i++) {
      point p = points.get(i);
      ellipse(p.x, p.y, 12, 12);
      point(p.x, p.y);
    }
  }

  // Prep the points. Make lerped points. Export pgraphics w/ texture mapping
  void export_image() {
    scale_points();
    ArrayList<shape_texture_point> lerped_points = make_lerped_points();
    create_image_for_export(lerped_points);
  }

  // Upscales the clicked points back to the original image's dimensions
  void scale_points() {
    for (byte i=0; i<points.size(); i++) {
      points.get(i).scale_point(display_scale);
    }
  }

  // Creates the arrayList of lerped points.
  // This is the meat-and-potatoes and gets a little complex.
  ArrayList<shape_texture_point> make_lerped_points() {
    ArrayList<shape_texture_point> lerped_points = new ArrayList<shape_texture_point>();

    // Array for the pgraphics edge points
    point[] pg_edge_points = new point[4];
    pg_edge_points[0] = new point(0, 0);
    pg_edge_points[1] = new point(export_width, 0);
    pg_edge_points[2] = new point(export_width, export_height);
    pg_edge_points[3] = new point(0, export_height);

    for (int i=0; i <points.size(); i++) {
      int next_i = (i+1) % 4;

      // Sets the start/end points forming the border of the PGraphics
      point pg_start_point = pg_edge_points[i];
      point pg_end_point = pg_edge_points[next_i];

      // Sets the start/end clicked points
      point img_map_start_point = points.get(i);
      point img_map_end_point = points.get(next_i);

      for (int lerp_index=0; lerp_index<lerp_steps; lerp_index++) {
        float lerp_value = float(lerp_index) / float(lerp_steps);

        shape_texture_point stp = new shape_texture_point(
          lerp(pg_start_point.x, pg_end_point.x, lerp_value),
          lerp(pg_start_point.y, pg_end_point.y, lerp_value),
          lerp(img_map_start_point.x, img_map_end_point.x, lerp_value),
          lerp(img_map_start_point.y, img_map_end_point.y, lerp_value));

        lerped_points.add(stp);
      }
    }

    return(lerped_points);
  }

  // Creates the PGraphics and draws the texture-mapped rectange.
  void create_image_for_export(ArrayList<shape_texture_point> lerped_points) {
    PGraphics pg = createGraphics(export_width, export_height, P2D);
    
    pg.smooth(4);
    pg.beginDraw();
    pg.noStroke();
    pg.textureMode(IMAGE);
    pg.beginShape();
    pg.texture(image);
    for (int i=0; i<lerped_points.size(); i++) {
      shape_texture_point stp = lerped_points.get(i);
      pg.vertex(stp.shape_x, stp.shape_y, stp.tex_x, stp.tex_y);
    }
    pg.endShape();
    pg.save(output_dir + "/" + file_name + "-Edited.tif");
    pg.endDraw();

    println("Export completed.");
  }
}
