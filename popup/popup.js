// const output_p = document.getElementById('output_p');
// 
// output_p.innerText = 'extension loaded';
// 
// const query_options = {
//     active:true,
//     currentWindow:true
// };
// 
// chrome.tabs.query(query_options, tabs => {
//     const message = {
//         message : 'getSelection'
//     };
// 
//     chrome.tabs.sendMessage(tabs[0].id, message, response => {
//         output_p.innerText = 'The Selected Text has ' + response.data.length + ' characters.';
//     });
// });


//Function to toggle the configuration setting associated
//with the specified element and configuration identifier.
const toggleConfig = (toggle_element, config_identifier) => {
    if(toggle_element.getAttribute('class') === 'toggle_button'){
        //The toggle button is unset.
        chrome.storage.sync.set({[config_identifier] : true}, _ => { //ES6 bracket syntax to reference variable key_name.
            //Update the toggle_button_css after the 
            //setting is set successfully.
            toggle_element.setAttribute('class', 'toggle_button toggle_button_active');
        });
    }
    else{
        //The toggle button is set
        chrome.storage.sync.set({[config_identifier] : false}, _ => { //ES6 bracket syntax to reference variable key_name.
            //Update the toggle_button_css after the 
            //setting is set successfully.
            toggle_element.setAttribute('class', 'toggle_button');
        });
    }
};

const loadConfig = (toggle_element, config_identifier) => {
    chrome.storage.sync.get(config_identifier, result => {
        if(result[config_identifier] === true){
            toggle_element.setAttribute('class', 'toggle_button toggle_button_active');
        }
        else if(result[config_identifier] === false){
            toggle_element.setAttribute('class', 'toggle_button');
        }
        else{
            //This config option is unset, use default value.
            switch(config_identifier){
                case 'enable_extension':
                    toggle_element.setAttribute('class', 'toggle_button toggle_button_active');
                    break;
                case 'hide_onscroll':
                    toggle_element.setAttribute('class', 'toggle_button');
                    break;
                case 'sentence_line_break':
                    toggle_element.setAttribute('class', 'toggle_button toggle_button_active');
                    break;
                case 'double_line_break':
                    toggle_element.setAttribute('class', 'toggle_button toggle_button_active');
                    break;
                case 'detect_dark_mode':
                    toggle_element.setAttribute('class', 'toggle_button');
                    break;
                case 'highlight_readable':
                    toggle_element.setAttribute('class', 'toggle_button toggle_button_active');
                    break;
                default:
                    //ignore if there is no default value
                    return;
            }
        }
    });
};

const setTheme = (stylesheet_element, use_dark_theme) => stylesheet_element.setAttribute('href', use_dark_theme ? 'popup_dark.css' : 'popup.css');


//Retreive handles to all the toggle buttons.
const enable_extension_toggle = document.getElementById('enable_extension_toggle');
const hide_onscroll_toggle = document.getElementById('hide_onscroll_toggle');
const sentence_line_break_toggle = document.getElementById('sentence_line_break_toggle');
const double_line_break_toggle = document.getElementById('double_line_break_toggle');
const detect_dark_mode_toggle = document.getElementById('detect_dark_mode_toggle');
const highlight_readable_toggle = document.getElementById('highlight_readable_toggle');
const copy_to_clipboard_toggle = document.getElementById('copy_to_clipboard_toggle');

//load configuration values
loadConfig(enable_extension_toggle, 'enable_extension');
loadConfig(hide_onscroll_toggle, 'hide_onscroll');
loadConfig(sentence_line_break_toggle, 'sentence_line_break');
loadConfig(double_line_break_toggle, 'double_line_break');
loadConfig(detect_dark_mode_toggle, 'detect_dark_mode');
loadConfig(highlight_readable_toggle, 'highlight_readable');
loadConfig(copy_to_clipboard_toggle, 'copy_to_clipboard');

//Setup onclick event listeners.
enable_extension_toggle.onclick = _ => toggleConfig(enable_extension_toggle, 'enable_extension');
hide_onscroll_toggle.onclick = _ => toggleConfig(hide_onscroll_toggle, 'hide_onscroll');
sentence_line_break_toggle.onclick = _ => toggleConfig(sentence_line_break_toggle, 'sentence_line_break');
double_line_break_toggle.onclick = _ => toggleConfig(double_line_break_toggle,  'double_line_break');
detect_dark_mode_toggle.onclick = _ => toggleConfig(detect_dark_mode_toggle, 'detect_dark_mode');
highlight_readable_toggle.onclick = _ => toggleConfig(highlight_readable_toggle, 'highlight_readable');
copy_to_clipboard_toggle.onclick = _ => toggleConfig(copy_to_clipboard_toggle, 'copy_to_clipboard');

//Dark theme detection handling.
const stylesheet = document.getElementById('stylesheet');
const prefers_dark_mode = window.matchMedia('(prefers-color-scheme: dark)');
chrome.storage.sync.get('detect_dark_mode', result => {
    setTheme(
        stylesheet, 
        result['detect_dark_mode'] === true ? 
            prefers_dark_mode.matches :
            false
    );
});
chrome.storage.onChanged.addListener((changes, area_name) => {
    if(area_name === 'sync' && changes['detect_dark_mode'] !== undefined){
        setTheme(
            stylesheet, 
            changes['detect_dark_mode'].newValue ? 
                prefers_dark_mode.matches :
                false
        );
    }
});