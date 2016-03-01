#include "boilerplate.h"
Window *main_window;
Layer *root_layer;
bool emulator=false;
// char screentext[18*21]="initializing...";
// uint8_t textcolor[18*21];  // foreground text color
// uint8_t backcolor[18*21];  // background text color
//8x8 pixel font
#define MAX_ROWS 21
#define MAX_COLS 18

//4x6 pixel Font
//#define MAX_ROWS 28
//#define MAX_COLS 35 // Technically 36, but skipping bottom row due to corner mask.

char screentext[MAX_ROWS*MAX_COLS]="initializing...";
uint8_t textcolor[MAX_ROWS*MAX_COLS];  // foreground text color
uint8_t backcolor[MAX_ROWS*MAX_COLS];  // background text color

char buffer[256];
GBitmap *font8_bmp; uint8_t *font8;
GBitmap *font4_bmp; uint8_t *font4;

void draw_sprite4(uint8_t *fb, uint8_t *font, int16_t start_x, int16_t start_y, uint8_t color, uint8_t background_color, uint8_t spr) {  // in B&W, color=0 is black, else white
  uint16_t left   = (start_x <     0) ? (start_x >  -4) ?   0 - start_x : 4 : 0;
  uint16_t right  = (start_x > 144-4) ? (start_x < 144) ? 144 - start_x : 0 : 4;
  uint16_t top    = (start_y <     0) ? (start_y >  -6) ?   0 - start_y : 6 : 0;
  uint16_t bottom = (start_y > 168-6) ? (start_y < 168) ? 168 - start_y : 0 : 6;
  uint8_t    *row = font + (spr>>1);//(spr>>3);// + (top*64);
  uint16_t y_addr = (start_y + top) * PBL_IF_COLOR_ELSE(144, 20);
  uint8_t mask = (spr & 1) ? 8 : 128;
    
  for(uint16_t y=top; y<bottom; ++y) {
   for(uint16_t x=left; x<right; ++x) {
//   for(uint16_t y=0; y<6; ++y) {
//     for(uint16_t x=0; x<4; ++x) {
      #ifdef PBL_BW
        //fb[y_addr + ((start_x+x) >> 3)] &= ~(1 << ((start_x+x)&7)); // Black Background (comment both out for clear background)
        //fb[y_addr + ((start_x+x) >> 3)] |=  (1 << ((start_x+x)&7)); // White Background (comment both out for clear background)
        //if(color)
        //  fb[y_addr + ((start_x+x) >> 3)] |=  ((((*row>>x)&1)) << ((start_x+x)&7)); // White Pixel
        //else
        //  fb[y_addr + ((start_x+x) >> 3)] &= ~((((*row>>x)&1)) << ((start_x+x)&7)); // Black Pixel
      #else
        //if((*row>>x)&1)   // horizontally flipped
        if((*row&(mask>>x))) // normal
          fb[y_addr + start_x + x] = color;
        else
          fb[y_addr + start_x + x] = background_color;
      #endif
    }
    y_addr += PBL_IF_COLOR_ELSE(144, 20);
    row += 64;
  }
}

// void draw_font4_text(uint8_t *fb, int16_t x, int16_t y, uint8_t color, char *str) { // str points to zero-terminated string
//   uint8_t strpos=0;
//   while(str[strpos]>0) {
//     if(x>(144-4)) {x=0; y+=6;}  // wrap horizontally
//     if(y>(168-6)) y=0;          // wrap vertically
//     draw_sprite4(fb, font4, x, y, color, str[strpos]);
//     x+=4; strpos++;
//   }
// }


void draw_sprite8(uint8_t *fb, uint8_t *font, int16_t start_x, int16_t start_y, uint8_t color, uint8_t background_color, uint8_t spr) {  // in B&W, color=0 is black, else white
  uint16_t left   = (start_x <     0) ? (start_x >  -8) ?   0 - start_x : 8 : 0;
  uint16_t right  = (start_x > 144-8) ? (start_x < 144) ? 144 - start_x : 0 : 8;
  uint16_t top    = (start_y <     0) ? (start_y >  -8) ?   0 - start_y : 8 : 0;
  uint16_t bottom = (start_y > 168-8) ? (start_y < 168) ? 168 - start_y : 0 : 8;
  uint8_t    *row = font + (spr&3) + ((spr&252)*8) + (top*4);
  uint16_t y_addr = (start_y + top) * PBL_IF_COLOR_ELSE(144, 20);

  for(uint16_t y=top; y<bottom; ++y) {
    for(uint16_t x=left; x<right; ++x) {
      #ifdef PBL_BW
        if(color&0b00111111) {
          fb[y_addr + ((start_x+x) >> 3)] &= ~(1 << ((start_x+x)&7)); // Black Background (comment out for clear background)
          fb[y_addr + ((start_x+x) >> 3)] |=  ((((*row>>x)&1)) << ((start_x+x)&7)); // White Pixel
        } else {
          fb[y_addr + ((start_x+x) >> 3)] |=  (1 << ((start_x+x)&7)); // White Background (comment out for clear background)
          fb[y_addr + ((start_x+x) >> 3)] &= ~((((*row>>x)&1)) << ((start_x+x)&7)); // Black Pixel
        }
      #else
        //if((*row>>x)&1)   // horizontally flipped
        if((*row&(128>>x))) // normal
          fb[y_addr + start_x + x] = color;
        else
          fb[y_addr + start_x + x] = background_color;
      #endif
    }
    y_addr += PBL_IF_COLOR_ELSE(144, 20);
    row += 4;
  }
}

// void draw_screen_text(uint8_t *fb) {
//   uint16_t strpos=0;
//   for(uint16_t y=0; y<MAX_ROWS; ++y) {
//     for(uint16_t x=0; x<MAX_COLS; ++x) {
//       draw_sprite4(fb, font4, x*4, y*6, textcolor[strpos], backcolor[strpos], screentext[strpos]);
//       ++strpos;
//     }
//   }
// }

void draw_screen_text(uint8_t *fb) {
  uint16_t strpos=0;
  for(uint16_t y=0; y<21; ++y) {
    for(uint16_t x=0; x<18; ++x) {
      draw_sprite8(fb, font8, x*8, y*8, textcolor[strpos], backcolor[strpos], screentext[strpos]);
      ++strpos;
    }
  }
}

void move_screen_text_up_one_line() {
  for(uint16_t y=0; y<MAX_ROWS-1; ++y) {
    for(uint16_t x=0; x<MAX_COLS; ++x) {
      screentext[y*MAX_COLS+x] = screentext[(y+1)*MAX_COLS+x];
       textcolor[y*MAX_COLS+x] =  textcolor[(y+1)*MAX_COLS+x];
       backcolor[y*MAX_COLS+x] =  backcolor[(y+1)*MAX_COLS+x];
    }
  }
  for(uint16_t x=0; x<MAX_COLS; ++x) {
    screentext[(MAX_ROWS-1)*MAX_COLS + x] = ' ';
     textcolor[(MAX_ROWS-1)*MAX_COLS + x] = 0b11000000;
     backcolor[(MAX_ROWS-1)*MAX_COLS + x] = 0b11000000;
  }
  layer_mark_dirty(root_layer);
}

void add_text(char *str, uint8_t color, uint8_t bgcolor) { // TOFIX: Buffer Overrun possibility
  uint16_t strpos=0, x=MAX_COLS;
  while(str[strpos]>0 && strpos<255) {
    if(x==MAX_COLS) {
      x=0;
      move_screen_text_up_one_line();
    }
    if(str[strpos]==10 || str[strpos]==13) {  // if CR or LF
      if(x>0)
        for(; x<MAX_COLS; ++x) {
          screentext[(MAX_ROWS-1)*MAX_COLS+x] = ' ';
           textcolor[(MAX_ROWS-1)*MAX_COLS+x] = color;
           backcolor[(MAX_ROWS-1)*MAX_COLS+x] = bgcolor;
        }
    } else {
      screentext[(MAX_ROWS-1)*MAX_COLS+x] = str[strpos];
       textcolor[(MAX_ROWS-1)*MAX_COLS+x] = color;
       backcolor[(MAX_ROWS-1)*MAX_COLS+x] = bgcolor;
      x++;
    }
    strpos++;
  }
  for(; x<MAX_COLS; ++x) {
    screentext[(MAX_ROWS-1)*MAX_COLS+x] = ' ';
     textcolor[(MAX_ROWS-1)*MAX_COLS+x] = color;
     backcolor[(MAX_ROWS-1)*MAX_COLS+x] = bgcolor;
  }
  layer_mark_dirty(root_layer);
}

void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, dn_click_handler);
  window_single_click_subscribe(BUTTON_ID_SELECT, sl_click_handler);
  //window_single_click_subscribe(BUTTON_ID_BACK, bk_click_handler);
}

void battery_handler(BatteryChargeState charge_state) {
  static int previous_state = 0;  // To stop the friggin CONSTANT messages with no state change!
  if (charge_state.is_charging || charge_state.is_plugged) {
    if(previous_state != 1) {
      LOG("External Power Detected: Backlight On");
      previous_state = 1;
      light_enable(true);
    }
  } else {
    if(previous_state != 2) {
      LOG("Battery Power Detected: Backlight Auto");
      previous_state = 2;
      light_enable(false);
    }
  }
}

int main(void) {
  init();
  
  emulator = watch_info_get_model()==WATCH_INFO_MODEL_UNKNOWN;
  if(emulator) {
    light_enable(true);  // Good colors on emulator
    LOG("Emulator Detected: Turning Backlight On");
  }
  
  battery_state_service_subscribe(battery_handler);
  battery_handler(battery_state_service_peek());
  
  app_event_loop();
  deinit();
  
  battery_state_service_unsubscribe();
}