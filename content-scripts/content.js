
// //inject html element to view word count
// const popover = document.createElement('div');
// popover.innerText = '';
// document.body.prepend(popover);
// 
// 
// //event-listener to detect selections on webpage
// document.onselect = _ => {
//     const selection = document.getSelection();
// 
//     //expression to check if the selection is valid
//     popover.innerText = selection.type === 'Range' ?
//         selection.toString().length : 
//         popover.innerText;
// };

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if(request.message === 'getSelection'){
//         const response = {
//             data : document.getSelection().toString()
//         };
// 
//         sendResponse(response);
//     }
// });


//---------------------------------------------------------
// Helper Functions 
//---------------------------------------------------------
//helper function to clamp values
const clamp = (value, min, max) => {
    return value > max ?
        max :
        value < min ?
            min :
            value;
};


//Georgia Font Size Multiplier = 0.4 (Measured From Lorem Ipsum Text)
//Used in MULTIPLIER * BASE_FONT_SIZE * CHARACTERS 
// = WIDTH THESE CHARACTERS TAKE UP

const BASE_FONT_SIZE = 32; //base-font size is 32px exact
const LETTER_WIDTH_MULTIPLIER = 0.4;
const READER_HORIZONTAL_PADDING = 40; // 20x on both sides
const READER_MAX_WIDTH = LETTER_WIDTH_MULTIPLIER * BASE_FONT_SIZE * 70 + READER_HORIZONTAL_PADDING; //509x27 @ 18px Georgia 70 characters Lorem Ipsum
const READER_MIN_WIDTH = LETTER_WIDTH_MULTIPLIER * BASE_FONT_SIZE * 50 + READER_HORIZONTAL_PADDING; //370x27 @ 18px Georgia 50 characters Lorem Ipsum

//helper function to calculate optimal font size in pixels
const getResponsiveReaderFontSize = _ => {
    //it tries to fit 50 to 70 characters on screen for optimal-
    //readability according to typography theory.

    //Rearrange the READER_MIN_WIDTH formula to solve for font_size
    //window.innerWidth = 0.4 * font_size * 50 + padding
    //window.innerWidth - padding = 0.4 * font_size * 50
    //(window.innerWidth - padding) / (0.4 * 50) = font_size
    return document.body.clientWidth < READER_MIN_WIDTH ?
        (document.body.clientWidth - READER_HORIZONTAL_PADDING) / (LETTER_WIDTH_MULTIPLIER * 50) :
        BASE_FONT_SIZE;
};


const stripAttributes = html => {
    return html.replaceAll(/<([a-z][a-z0-9]*)[^>]*?(\/?)>/ig, '<$1$2>');
};


const insertSentenceLineBreaks = html => {
    return html.replaceAll(/((?:[A-z0-9]+)(?:\s\S+){2,})([\.\?\!]+)/g, '$1$2<br>');
};

const stripSvg = html => {
    return html.replaceAll(/\<svg\>.+\<\/svg\>/g, '');
};

const trimHyperlinks = html_element => {
    const hyperlinks = html_element.getElementsByTagName('a');
    for(let i = 0; i < hyperlinks.length; i++){
        hyperlinks.item(i).innerHTML = hyperlinks.item(i).innerText.replace('open in new window', '');
    }
};


const setIndicator = element => {
    const previous_class = element.getAttribute('class');
    if(previous_class === null){
        //This element has no class assigned.
        element.setAttribute('class', 'reader_hovering');
    }
    else{
        //This element already has a pre-existing class.
        element.setAttribute('previousClass', previous_class);
        element.setAttribute('class', previous_class + ' reader_hovering');
    }
};


const unsetIndicator = element => {
    const previous_class = element.getAttribute('previousClass');
    if(previous_class === null){
        //This element has no class assigned.
        element.removeAttribute('class');
    }
    else{
        //This element already has a pre-existing class.
        element.setAttribute('class', previous_class);
    }
};


const loadFont = (name, url) => {
    const new_font = new FontFace(name, url);
    new_font.load().then(font => document.fonts.add(font));
};

const setTheme = (stylesheet_element, use_dark_theme) => stylesheet_element.setAttribute(
    'href', 
    use_dark_theme ? 
        chrome.runtime.getURL('public/stylesheets/reader_dark.css') :
        chrome.runtime.getURL('public/stylesheets/reader.css')
);


//---------------------------------------------------------
// Content Script Entry Point 
//---------------------------------------------------------
//Main entry point, don't do anything until data is loaded.
chrome.storage.sync.get(null, config => {
    //load font-faces
    loadFont('fira-code', chrome.runtime.getURL('/public/fonts/firacode_variable.ttf'));
    loadFont('pt-sans-regular', chrome.runtime.getURL('/public/fonts/ptsans_regular.ttf'));
    loadFont('pt-sans-bold', chrome.runtime.getURL('/public/fonts/ptsans_bold.ttf'));

    //inject html elements for modal reader
    const toast_div = document.createElement('DIV');
    toast_div.id = 'toast'; //#toast
    toast_div.style.zIndex = Number.MAX_SAFE_INTEGER;
    document.body.prepend(toast_div);

    const reader_div = document.createElement('div');
    reader_div.id = 'reader'; //#reader
    reader_div.style.zIndex = Number.MAX_SAFE_INTEGER;
    reader_div.style.fontSize = `${getResponsiveReaderFontSize()}px`;
    reader_div.style.maxWidth = `${READER_MAX_WIDTH}px`;
    document.body.prepend(reader_div);

    const content = document.createElement('DIV');
    content.id = 'reader_content'; //#reader_content
    reader_div.append(content);

    //inject css 
    const prefers_dark_mode = window.matchMedia('(prefers-color-scheme: dark)');
    const stylesheet = document.createElement('link');
    stylesheet.id = 'reader_css';
    stylesheet.setAttribute('rel', 'stylesheet');
    setTheme(
        stylesheet, 
        //Syncs modal reader theme to browser theme if enabled (disabled by default)
        config['detect_dark_mode'] === true ?
            prefers_dark_mode.matches :
            false
    );
    document.body.prepend(stylesheet);


    //---------------------------------------------------------
    // Event Listeners
    //---------------------------------------------------------
    //event-listener to open reader
    document.ondblclick = e => {
        //open reader on double-click if extension is enabled or undefined (enabled by default)
        if(config['enable_extension'] !== false){
            let content_is_new = false;
            let content_html = '';

            switch(e.target.tagName){
                case 'H1':
                case 'H2':
                case 'H3':
                case 'H4':
                case 'H5':
                case 'H6':
                case 'LI': //#reader_content > ...
                case 'TD': //#reader_content > ...
                    //content_html = stripAttributes(e.target.innerHTML);
                    content_html = e.target.innerHTML;
                    content_is_new = content.innerHTML === content_html ? false : true;
                    content.innerHTML = content_html;
                    break;
                case 'OL':
                case 'UL':
                case 'BLOCKQUOTE':
                case 'EM':
                case 'I':
                case 'B':
                case 'STRONG':
                case 'P': //#reader_content > p > ...
                case 'SPAN': //#reader_content > span > ...
                    //content_html = stripAttributes(e.target.outerHTML);
                    content_html = e.target.outerHTML;
                    content_is_new = content.innerHTML === content_html ? false : true;
                    content.innerHTML = content_html;
                    break;
                case 'SECTION':
                case 'ARTICLE':
                case 'DIV': //#reader_content > ...
                    //check to see if this div has any text content first
                    if(e.target.innerText.length > 3) {
                        //content_html = stripAttributes(e.target.innerHTML);
                        content_html = e.target.innerHTML;
                        content_is_new = content.innerHTML === content_html ? false : true;
                        content.innerHTML = content_html;
                        break;
                    }
                    else return; //ignore if this DIV has no text content
                default: return; //don't bother executing the rest if no matches
            }

            //clear the text selection to indicate this was processed
            document.getSelection().collapse(null);

            //trim hyperlinks
            trimHyperlinks(content);

            //strip attributes
            content.innerHTML = stripAttributes(content.innerHTML);

            //insert newline after each sentence if enabled or undefined (enabled by default)
            if(config['sentence_line_break'] !== false){
                content.innerHTML = insertSentenceLineBreaks(content.innerHTML);
            }

            //insert double line breaks if enabled or undefined (enabled by default)
            if(config['double_line_break'] !== false){
                content.innerHTML = content.innerHTML.replaceAll(/(\s*\<br\>\s*)+/g, '$1$1');
            }

            //remove trailing line breaks
            content.innerHTML = content.innerHTML.replaceAll(/(?:\s*\<br\>\s*){2}(\s*\<\/.*\>)*\s*$/g, '$1');

            //remove line breaks inside links
            content.innerHTML = content.innerHTML.replaceAll(/(?<!\<a\>[\s.]*)(\<br\>){2}(?![\s.]*\<\/a\>)/g, '');

            //remove any SVG elements
            //content.innerHTML = stripSvg(content.innerHTML);

            //show the reader
            reader_div.style.display = 'block';

            //determine whether or not to scroll to the top
            if(content_is_new) reader_div.scrollTo(0, 0); //always scroll to the top if new content is read
            //else SAVE_SCROLL_POSITION === false && reader_div.scrollTo(0, 0); //else, scroll to the top if the SAVE_SCROLL_POSITION flag isn't set

            //then move it to the user's cursor
            const modal_height = window.getComputedStyle(reader_div).getPropertyValue('height');
            const modal_width = window.getComputedStyle(reader_div).getPropertyValue('width');
            const top_offset_px = e.clientY - parseInt(modal_height) / 2;
            const left_offset_px = e.clientX - parseInt(modal_width) / 2;

            //Maximum value is calculated by subtracting the portion 
            //of space that the modal takes up from the full viewport viewing area
            //
            //window.innerWidth returns the viewport width of the window including
            //scrollbars and window borders.
            reader_div.style.top = clamp(top_offset_px, 0, window.innerHeight - parseInt(modal_height)) + 'px';
            reader_div.style.left = clamp(left_offset_px, 0, window.innerWidth - parseInt(modal_width)) + 'px';

            //copy content to clipboard if enabled (disabled by default)
            const copyToClipboard = async text => {
                //Copy text to the clipboard.
                await navigator.clipboard.writeText(text);

                //Show and center the toast notification.
                toast_div.innerHTML = `<span>Copied:</span> ${text}`;
                const toast_width = window.getComputedStyle(toast_div).getPropertyValue('width');
                toast_div.style.left = ((window.innerWidth / 2) - (parseInt(toast_width) / 2)) + 'px';
                toast_div.style.opacity = 1;

                //Start a timer to hide the toast notification after 3000ms.
                window.setTimeout(_ => {
                    toast_div.style.opacity = 0;
                }, 3000);
            };
            if(config['copy_to_clipboard'] === true && config['enable_extension'] !== false) {
                copyToClipboard(e.target.innerText);
            }
        }
    }


    //event-listener to hide modal-reader when moused-over
    reader_div.onmousemove = _ => {
        reader_div.style.display = 'none';
    };


    //event-listener to hide modal-reader onscroll
    window.onscroll = _ => {
        //hide modal-reader onscroll if enabled, (disabled by default)
        if(config['hide_onscroll'] === true && config['enable_extension'] !== false){
            reader_div.style.display = 'none';
        }
    };


    //event-listener to draw indicator
    let hovering_current = document.createElement('DIV');
    document.body.onmouseover = e => {
        //highlight readable elements if enabled or undefined (enabled by default)
        if(config['highlight_readable'] !== false && config['enable_extension'] !== false){ 
            switch(e.target.tagName){
                case 'H1':
                case 'H2':
                case 'H3':
                case 'H4':
                case 'H5':
                case 'H6':
                case 'LI': //#reader_content > ...
                case 'TD': //#reader_content > ...
                case 'OL':
                case 'UL':
                case 'BLOCKQUOTE':
                case 'EM':
                case 'I':
                case 'B':
                case 'STRONG':
                case 'P': //#reader_content > p > ...
                case 'SPAN': //#reader_content > span > ...
                case 'SECTION':
                case 'ARTICLE':
                    break;
                case 'DIV': //#reader_content > ...
                    //check to see if this div has any text content first
                    if(e.target.innerText.length > 3) break;
                default: return; //don't bother executing the rest if no matches
            }

            unsetIndicator(hovering_current);
            hovering_current = e.target;
            setIndicator(hovering_current);
        }
    };


    //event-listener to resize text for optimal reading
    window.onresize = _ => {
        reader_div.style.fontSize = `${getResponsiveReaderFontSize()}px`;
    };


    //event-listener to switch to dark-theme
    prefers_dark_mode.onchange = _ => {
        //detect dark mode if enabled, (disabled by default)
        if(config['detect_dark_mode'] === true && config['enable_extension'] !== false){
            setTheme(stylesheet, prefers_dark_mode.matches);
        }
    };

    chrome.storage.onChanged.addListener((changes, area_name) => {
        if(area_name === 'sync'){
            Object.keys(changes).forEach(key => {
                switch(key){
                    case 'enable_extension':
                    case 'highlight_readable':
                        unsetIndicator(hovering_current);
                        break;
                    case 'detect_dark_mode':
                        setTheme(
                            stylesheet, 
                            //Syncs modal reader theme to browser theme if enabled (disabled by default)
                            changes[key].newValue === true ?
                                prefers_dark_mode.matches :
                                false
                        );
                        break;
                    default:
                        //Ignore and continue if no special case is detected.
                        break;
                }
                config[key] = changes[key].newValue;
            });
        }
    });

});
