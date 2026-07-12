const BASE_PHP = "sudo php /home/netrivals/bin/console";
const FIXED_METHOD = "curl-impersonate";
let importLocked = false;

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function checkActive(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

function getRadioValue() {
    const el = document.querySelector('input[name="conf_field_type"]:checked');
    return el ? el.value : 'NONE';
}

function toggleRegexInput() {
    const confirmationType = getRadioValue();
    const wrapper = document.getElementById('wrapper-conf-regex');
    
    if (confirmationType !== 'NONE') {
        wrapper.classList.remove('hidden');
        wrapper.style.display = 'grid'; // Maintain CSS inline grid structure
    } else {
        wrapper.classList.add('hidden');
        wrapper.style.display = 'none';
    }
    
    updateRealTimeView();
}

function insertAtCursor(inputEl, valueStr) {
    if (!inputEl) return;
    const startPos = inputEl.selectionStart;
    const endPos = inputEl.selectionEnd;
    const originalText = inputEl.value;

    inputEl.value = originalText.substring(0, startPos) + valueStr + originalText.substring(endPos, originalText.length);
    inputEl.focus();
    inputEl.selectionStart = inputEl.selectionEnd = startPos + valueStr.length;
    updateRealTimeView();
}

function injectPlaceholderToUrl() { insertAtCursor(document.getElementById('search_url'), '%s'); }
function injectPlaceholderToPost() { insertAtCursor(document.getElementById('post_payload'), '%s'); }
function injectPlaceholderToUrlBuild() { insertAtCursor(document.getElementById('url_build'), '{%s1}'); }

// PARSER: Breaks down old commands pasted in the output textarea
function analyzeAndParsePastedCommand(commandStr) {
    if (!commandStr.includes("php /home/netrivals/bin/console")) return;
    
    importLocked = true;

    // 1. Store IDs
    const storeMatches = commandStr.match(/(?:ean-biter-by-store-id(?:-launcher)?)\s+(\d+)\s+(\d+)/);
    if (storeMatches) {
        document.getElementById('client_store_id').value = storeMatches[1];
        document.getElementById('rival_store_id').value = storeMatches[2];
    }

    // 2. Proxy
    const proxyMatch = commandStr.match(/"curl-impersonate"\s+"([^"]+)"/);
    if (proxyMatch) {
        const proxySelector = document.getElementById('proxy');
        if ([...proxySelector.options].some(o => o.value === proxyMatch[1])) {
            proxySelector.value = proxyMatch[1];
        }
    }

    // 3. Search URL
    const urlMatch = commandStr.match(/"curl-impersonate"\s+"[^"]+"\s+"([^"]+)"/);
    if (urlMatch) document.getElementById('search_url').value = urlMatch[1];

    // 4. Main Regex and its 'si' Flag evaluation
    const regexMatch = commandStr.match(/"curl-impersonate"\s+"[^"]+"\s+"[^"]+"\s+'([^']+)'/);
    if (regexMatch) {
        let cleanRegex = regexMatch[1];
        if (cleanRegex.endsWith('si')) {
            document.getElementById('chk_regex_si').checked = true;
            cleanRegex = cleanRegex.slice(0, -2);
        } else {
            document.getElementById('chk_regex_si').checked = false;
        }
        document.getElementById('main_regex').value = cleanRegex;
    }

    // 5. Optional explicit parameters
    const postMatch = commandStr.match(/--post\s+'([^']+)'/);
    document.getElementById('post_payload').value = postMatch ? postMatch[1] : '';

    const urlBuildMatch = commandStr.match(/--url-build-expression\s+"([^"]+)"/);
    document.getElementById('url_build').value = urlBuildMatch ? urlBuildMatch[1] : '';

    const headersMatch = commandStr.match(/--get-content-method-options\s+'([^']+)'/);
    document.getElementById('method_options').value = headersMatch ? headersMatch[1] : '';

    // 6. Additional checkboxes
    document.getElementById('chk_suggest').checked = commandStr.includes("--connection-type 'to_suggest'");
    document.getElementById('chk_ref').checked = commandStr.includes('--use-ref-as-ean');
    document.getElementById('chk_mpn').checked = commandStr.includes('--use-mpn-as-ean');
    document.getElementById('chk_title').checked = commandStr.includes('--search-value-expression {%Title}');

    // 7. Confirmation fields and its 'si' flag injection
    const confFieldMatch = commandStr.match(/--confirmation-field\s+(\w+)/);
    if (confFieldMatch) {
        const rBtn = document.querySelector(`input[name="conf_field_type"][value="${confFieldMatch[1]}"]`);
        if (rBtn) rBtn.checked = true;
    } else {
        document.querySelector('input[name="conf_field_type"][value="NONE"]').checked = true;
    }

    const confRegexMatch = commandStr.match(/--confirmation-regex\s+'([^']+)'/);
    if (confRegexMatch) {
        let cleanConfRegex = confRegexMatch[1];
        if (cleanConfRegex.endsWith('si')) {
            document.getElementById('chk_conf_regex_si').checked = true;
            cleanConfRegex = cleanConfRegex.slice(0, -2);
        } else {
            document.getElementById('chk_conf_regex_si').checked = false;
        }
        document.getElementById('conf_regex').value = cleanConfRegex;
    }

    // 8. Test Value
    const testValMatch = commandStr.match(/--test-value\s+(\d+)/);
    if (testValMatch) document.getElementById('test_value').value = testValMatch[1];

    importLocked = false;
    toggleRegexInput();
}

function generateCommand(mode) {
    if (importLocked) return document.getElementById('output').value;

    if (!getVal('client_store_id') && !getVal('rival_store_id') && !getVal('search_url') && getVal('main_regex') === '#url:"([^"]+)"#') {
        return '';
    }

    let binary = (mode === 'test') ? "netrivals:ean-biter-by-store-id" : "netrivals:ean-biter-by-store-id-launcher";
    let controlVal = (mode === 'test') ? "0 1" : "10";

    let cmd = `${BASE_PHP} ${binary} ${getVal('client_store_id') || '[STORE_1]'} ${getVal('rival_store_id') || '[STORE_2]'} ${controlVal}`;
    cmd += ` "${FIXED_METHOD}"`;
    
    if (getVal('proxy')) cmd += ` "${getVal('proxy')}"`;
    if (getVal('search_url')) cmd += ` "${getVal('search_url')}"`;
    
    if (getVal('main_regex')) {
        let regexText = getVal('main_regex');
        if (checkActive('chk_regex_si')) regexText += 'si';
        cmd += ` '${regexText}'`;
    }

    if (getVal('method_options')) cmd += ` --get-content-method-options '${getVal('method_options')}'`;
    if (getVal('post_payload')) cmd += ` --post '${getVal('post_payload')}'`;
    if (getVal('url_build')) cmd += ` --url-build-expression "${getVal('url_build')}"`;

    cmd += ` --output passive-connections`;

    if (checkActive('chk_suggest')) cmd += ` --connection-type 'to_suggest'`;
    if (checkActive('chk_ref')) cmd += ` --use-ref-as-ean`;
    if (checkActive('chk_mpn')) cmd += ` --use-mpn-as-ean`;
    if (checkActive('chk_title')) cmd += ` --search-value-expression {%Title}`;

    const confirmationType = getRadioValue();
    if (confirmationType !== 'NONE') {
        cmd += ` --confirmation-field ${confirmationType}`;
        
        if (getVal('conf_regex')) {
            let confRegexText = getVal('conf_regex');
            if (checkActive('chk_conf_regex_si')) confRegexText += 'si';
            cmd += ` --confirmation-regex '${confRegexText}'`;
        }
    }

    cmd += ` -vvv`;

    if (mode === 'test' && getVal('test_value')) {
        cmd += ` --test-value ${getVal('test_value')}`;
    }

    return cmd;
}

function updateRealTimeView() {
    if (!importLocked) {
        document.getElementById('output').value = generateCommand('test');
    }
}

function copyCommand(mode) {
    const finalCommand = generateCommand(mode);
    if (!finalCommand) {
        alert('Please fill out the form before copying.');
        return;
    }
    const out = document.getElementById('output');
    out.value = finalCommand;
    out.select();
    document.execCommand('copy');
    
    setTimeout(updateRealTimeView, 1500);

    if(mode === 'test') {
        alert(`TEST command (0 1) copied to clipboard! 🧪`);
    } else {
        alert(`LAUNCHER command (10 Threads) copied to clipboard! 🚀`);
    }
}

document.getElementById('output').addEventListener('input', function() {
    analyzeAndParsePastedCommand(this.value);
});

['client_store_id', 'rival_store_id'].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, ''); 
            updateRealTimeView();
        });
    }
});

const inputsIds = ['proxy', 'search_url', 'main_regex', 'test_value', 'post_payload', 'url_build', 'method_options', 'conf_regex'];
inputsIds.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        if (el.tagName === 'SELECT') {
            el.addEventListener('change', updateRealTimeView);
        } else {
            el.addEventListener('input', updateRealTimeView);
        }
    }
});

document.getElementById('checkbox-advanced-group').addEventListener('change', updateRealTimeView);
document.getElementById('radio-confirmation-group').addEventListener('change', toggleRegexInput);
document.getElementById('chk_regex_si').addEventListener('change', updateRealTimeView);
document.getElementById('chk_conf_regex_si').addEventListener('change', updateRealTimeView);

toggleRegexInput();