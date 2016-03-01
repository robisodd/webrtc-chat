#include "boilerplate.h"
#ifdef PBL_SDK_3
DictationSession *dictation_session;
char dictation_text[512];
#endif

enum {
  KEY_SYS = 0,  // Receive system message
  KEY_MSG = 1,  // Receive message
  KEY_ERR = 2,  // Receive erorr message
  KEY_OPEN_CHANNEL = 3,  // Command: Open Channel
  KEY_SEND_TEXT = 4,     // Command: Send Text
};

void OpenChannel(char *channel_name) {
    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    if (!iter) return;  // Error creating outbound message
    dict_write_cstring(iter, KEY_OPEN_CHANNEL, channel_name);
    dict_write_end(iter);
    app_message_outbox_send();
}

void SendText(char *str) {
    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    if (!iter) return;  // Error creating outbound message
    dict_write_cstring(iter, KEY_SEND_TEXT, str);
    dict_write_end(iter);
    app_message_outbox_send();
}
  
// void send_int(uint8_t key, uint8_t cmd) {
//     DictionaryIterator *iter;
//     app_message_outbox_begin(&iter);
//     if (!iter) return;  // Error creating outbound message
//     Tuplet value = TupletInteger(key, cmd);
//     dict_write_tuplet(iter, &value);
//     app_message_outbox_send();
// }

void process_tuple(Tuple *t) {
  //Get key
  int key = t->key;
  int value = t->value->int32;  //Get integer value, if present

  char string_value[256];  
  strcpy(string_value, t->value->cstring);  //Get string value, if present

  //Decide what to do
  switch(key) {
    case KEY_SYS:  // System Message
    snprintf(buffer, sizeof(buffer), "%s", string_value);
    add_text(buffer, 0b11111111, 0b11001100);
    break;
    case KEY_MSG:  // Text from someone
    snprintf(buffer, sizeof(buffer), "%s", string_value);
    add_text(buffer, 0b11001111, 0b11000000);
    break;
    case KEY_ERR:  // Error
    snprintf(buffer, sizeof(buffer), "ERR: %s", string_value);
    add_text(buffer, 0b11111111, 0b11110000);
    break;
  }

  //Set time this update came in
//   time_t temp = time(NULL);
//   struct tm *tm = localtime(&temp);
//   strftime(time_buffer, sizeof("Last updated: XX:XX"), "Last updated: %H:%M", tm);
//   text_layer_set_text(time_layer, (char*) &time_buffer);
}

static void inbox_received_callback(DictionaryIterator *iter, void *context) {
  Tuple *t = dict_read_first(iter);  //Get data
  while(t != NULL) {
    process_tuple(t);
    t = dict_read_next(iter);  //Get next data
  }
}

// void inbox_received_callback(DictionaryIterator *iterator, void *context) {
//   Tuple *data = dict_find(iterator, KEY_DATA); // Get the first pair
//   if (data) {
//     snprintf(s_buffer, sizeof(s_buffer), "Received '%s'", data->value->cstring);
//     LOG(s_buffer);
//   }
// }

void inbox_dropped_callback(AppMessageResult reason, void *context) {
  LOG("Message dropped!");
}

void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  LOG("Outbox send failed!");
}

void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
  //LOG("Outbox send success!");
}

/******************************* Dictation API ********************************/
#ifdef PBL_SDK_3
static void dictation_session_callback(DictationSession *session, DictationSessionStatus status, char *transcription, void *context) {
  if(status == DictationSessionStatusSuccess) {
    // Send the dictated text
    snprintf(dictation_text, sizeof(dictation_text), "%s", transcription);
    LOG("Sending Dictation Text:");
    LOG(dictation_text);
    SendText(dictation_text);
  } else {
    // Display the reason for any error
    //snprintf(dictation_text, sizeof(dictation_text), "Transcription failed.\nError ID: %d", (int)status);
    snprintf(dictation_text, sizeof(dictation_text), "Dictation Err: %d", (int)status);
    add_text(dictation_text, 0b11000000, 0b11110000);  // error message to screen
  }
}
#endif
/************************************ Buttons *************************************/
void up_click_handler  (ClickRecognizerRef recognizer, void *context) { //   UP   button
  OpenChannel("testerbutt");
}

void sl_click_handler  (ClickRecognizerRef recognizer, void *context) { // SELECT button
  IF_SDK2_ELSE(add_text("ERR: No Microphone", 0b11000000, 0b11110000), dictation_session_start(dictation_session));
}

void dn_click_handler  (ClickRecognizerRef recognizer, void *context) { //  DOWN  button
  SendText("Hello!");
  //move_screen_text_up_one_line();
}


/************************************ Drawing *************************************/
void root_layer_update(Layer *me, GContext *ctx) {
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, GRect(0,0,144,168), 0, GCornerNone);

  uint8_t *framebuffer = (uint8_t*)*(size_t*)ctx;
  draw_screen_text(framebuffer);
}

/************************************ Main *************************************/
void main_window_load(Window *window) {
   font8_bmp = gbitmap_create_with_resource(RESOURCE_ID_FONT8); font8 = gbitmap_get_data(font8_bmp);
   font4_bmp = gbitmap_create_with_resource(RESOURCE_ID_FONT4); font4 = gbitmap_get_data(font4_bmp);
   root_layer = window_get_root_layer(window);
   layer_set_update_proc(root_layer, root_layer_update);
   window_set_click_config_provider(window, click_config_provider);
  add_text(" \n    Welcome to\n   RTC Chat 0.2\n \n", 0b11000100, 0b11111111);
}

void main_window_unload(Window *window) {
  gbitmap_destroy(font8_bmp);
  gbitmap_destroy(font4_bmp);
}

void init() {
  // Register callbacks
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_register_outbox_sent(outbox_sent_callback);

  app_message_open(256, 256);  // Open AppMessage with sensible buffer sizes
  // Create main Window
  main_window = window_create();
  window_set_window_handlers(main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });
  #ifdef PBL_SDK_2
  window_set_fullscreen(main_window, true);
  #endif
  window_stack_push(main_window, true);

  // Create new dictation session
  #ifdef PBL_SDK_3
  dictation_session = dictation_session_create(sizeof(dictation_text), dictation_session_callback, NULL);
  #endif
}

void deinit() {
  #ifdef PBL_SDK_3
  dictation_session_destroy(dictation_session);
  #endif
  window_destroy(main_window);  // Destroy main Window
}

