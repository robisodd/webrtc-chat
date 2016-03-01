#pragma once
#include <pebble.h>
#define logging true  // Enable/Disable logging for debugging
//Note: printf uses APP_LOG_LEVEL_DEBUG
#if logging
  #define LOG(...) (printf(__VA_ARGS__))
#else
  #define LOG(...)
#endif

extern Window *main_window;
extern Layer *root_layer;
extern char screentext[];
extern char buffer[256];
extern GBitmap *font8_bmp; extern uint8_t *font8;
extern GBitmap *font4_bmp; extern uint8_t *font4;
extern bool emulator;

void draw_sprite4(uint8_t *fb, uint8_t *font, int16_t start_x, int16_t start_y, uint8_t color, uint8_t background_color, uint8_t spr);  // in B&W, color=0 is black, else white
//void draw_font4_text(uint8_t *fb, int16_t x, int16_t y, uint8_t color, char *str); // str points to zero-terminated string
void draw_sprite8(uint8_t *fb, uint8_t *font, int16_t start_x, int16_t start_y, uint8_t color, uint8_t background_color, uint8_t spr);  // in B&W, color=0 is black, else white
//void draw_font8_text(uint8_t *fb, int16_t x, int16_t y, uint8_t color, char *str); // str points to zero-terminated string
void draw_screen_text(uint8_t *fb);
void add_text(char *str, uint8_t color, uint8_t backcolor);
void move_screen_text_up_one_line();

void up_click_handler(ClickRecognizerRef recognizer, void *context); //   UP   button was clicked
void sl_click_handler(ClickRecognizerRef recognizer, void *context); // SELECT button was clicked
void dn_click_handler(ClickRecognizerRef recognizer, void *context); //  DOWN  button was clicked
void click_config_provider(void *context);
void deinit();
void init();

// =========================================================================================================== //
//  Inline Multi-Pebble Support
// =========================================================================================================== //
#if defined(PBL_PLATFORM_APLITE)
  #define IF_APLITE(statement) (statement)
  #define IF_BASALT(statement)
  #define IF_CHALK(statement)
#elif defined(PBL_PLATFORM_BASALT)
  #define IF_APLITE(statement)
  #define IF_BASALT(statement) (statement)
  #define IF_CHALK(statement)
#elif defined(PBL_PLATFORM_CHALK)
  #define IF_APLITE(statement)
  #define IF_BASALT(statement)
  #define IF_CHALK(statement) (statement)
#else
  #define IF_APLITE(statement)
  #define IF_BASALT(statement)
  #define IF_CHALK(statement)
#endif


#if defined(PBL_COLOR)
  #define IF_COLOR(color) (color)
  #define IF_BW(bw)
  #define IF_COLOR_ELSE(color, other) (color)
  #define IF_BW_ELSE(bw, other) (other)
  #define IF_COLOR_BW(color, bw) (color)
  #define IF_BW_COLOR(bw, color) (color)
  #define IF_COLOR_BW_ELSE(color, bw, other) (color)
  #define IF_BW_COLOR_ELSE(bw, color, other) (color)
#elif defined(PBL_BW)
  #define IF_COLOR(color)
  #define IF_BW(bw) (bw)
  #define IF_COLOR_ELSE(color, other) (other)
  #define IF_BW_ELSE(bw, other) (bw)
  #define IF_COLOR_BW(color, bw) (bw)
  #define IF_BW_COLOR(bw, color) (bw)
  #define IF_COLOR_BW_ELSE(color, bw, other) (bw)
  #define IF_BW_COLOR_ELSE(bw, color, other) (bw)
#else
  #define IF_COLOR(color)
  #define IF_BW(bw)
  #define IF_COLOR_ELSE(color, other) (other)
  #define IF_BW_ELSE(bw, other) (other)
  #define IF_COLOR_BW(color, bw)
  #define IF_BW_COLOR(bw, color)
  #define IF_COLOR_BW_ELSE(color, bw, other) (other)
  #define IF_BW_COLOR_ELSE(bw, color, other) (other)
#endif

  
#if defined(PBL_SDK_2)
  #define IF_SDK2(SDK2) (SDK2)
  #define IF_SDK3(SDK3)
  #define IF_SDK2_ELSE(SDK2, other) (SDK2)
  #define IF_SDK3_ELSE(SDK3, other) (other)
  #define IF_SDK2_SDK3(SDK2, SDK3) (SDK2)
  #define IF_SDK2_SDK3_ELSE(SDK2, SDK3, other) (SDK2)
#elif defined(PBL_SDK_3)
  #define IF_SDK2(SDK2)
  #define IF_SDK3(SDK3) (SDK3)
  #define IF_SDK2_ELSE(SDK2, other) (other)
  #define IF_SDK3_ELSE(SDK3, other) (SDK3)
  #define IF_SDK2_SDK3(SDK2, SDK3) (SDK3)
  #define IF_SDK2_SDK3_ELSE(SDK2, SDK3, other) (SDK3)
#else
  #define IF_SDK2(SDK2)
  #define IF_SDK3(SDK3)
  #define IF_SDK2_ELSE(SDK2, other) (other)
  #define IF_SDK3_ELSE(SDK3, other) (other)
  #define IF_SDK2_SDK3(SDK2, SDK3)
  #define IF_SDK2_SDK3_ELSE(SDK2, SDK3, other) (other)
#endif

#if defined(PBL_RECT)
  #define IF_RECT(rect) (rect)
  #define IF_ROUND(round)
  #define IF_RECT_ELSE(rect, other) (rect)
  #define IF_ROUND_ELSE(round, other) (other)
  #define IF_RECT_ROUND(rect, round) (rect)
  #define IF_ROUND_RECT(round, rect) (rect)
  #define IF_RECT_ROUND_ELSE(rect, round, other) (rect)
  #define IF_ROUND_RECT_ELSE(round, rect, other) (rect)
#elif defined(PBL_ROUND)
  #define IF_RECT(rect)
  #define IF_ROUND(round) (round)
  #define IF_RECT_ELSE(rect, other) (other)
  #define IF_ROUND_ELSE(round, other) (round)
  #define IF_RECT_ROUND(rect, round) (round)
  #define IF_ROUND_RECT(round, rect) (round)
  #define IF_RECT_ROUND_ELSE(rect, round, other) (round)
  #define IF_ROUND_RECT_ELSE(round, rect, other) (round)
#else
  #define IF_RECT(rect)
  #define IF_ROUND(round)
  #define IF_RECT_ELSE(rect, other) (other)
  #define IF_ROUND_ELSE(round, other) (other)
  #define IF_RECT_ROUND(rect, round)
  #define IF_ROUND_RECT(round, rect)
  #define IF_RECT_ROUND_ELSE(rect, round, other) (other)
  #define IF_ROUND_RECT_ELSE(round, rect, other) (other)
#endif

// =========================================================================================================== //
//  Color Remapping
//  Copied from: https://github.com/cpfair/sand/blob/master/modules/colour_bw_remap.h
// =========================================================================================================== //
// Rather than compute the fallback during code generation
// This will allow us to continue to use GColorWhatever on Aplite without worrying about the B&W fallback
// The logic is: lightness > 0.5 ? GColorWhite : GColorBlack

// =========================================================================================================== //
