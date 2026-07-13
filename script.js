// Inicialización de Supabase (Con identificador único corregido)
const SUPABASE_URL = "https://iztkmcrtfmzlzavguuvl.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_l2E5C5qCL-HnzuVGeTiidg_wGEN8glj";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_PHP = "sudo php /home/netrivals/bin/console";
const FIXED_METHOD = "curl-impersonate";
let importLocked = false;
let cachedTeamCommands = []; 

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
        wrapper.style.display = 'grid';
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

// PARSER: Procesa comandos pegados manualmente e identifica inteligentemente cruces con la BD
function analyzeAndParsePastedCommand(commandStr) {
    if (!commandStr.includes("php /home/netrivals/bin/console")) return;
    
    importLocked = true;

    // 1. Store IDs
    const storeMatches = commandStr.match(/(?:ean-biter-by-store-id(?:-launcher)?)\s+(\d+)\s+(\d+)/);
    let extractedClient = '';
    let extractedRival = '';
    if (storeMatches) {
        extractedClient = storeMatches[1];
        extractedRival = storeMatches[2];
        document.getElementById('client_store_id').value = extractedClient;
        document.getElementById('rival_store_id').value = extractedRival;
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
    if (urlMatch) {
        let cleanUrl = urlMatch[1];
        cleanUrl = cleanUrl.replace(/[\?&]client_id=\d+/, '').replace(/&rival_id=\d+/, '').replace(/\?rival_id=\d+/, '');
        document.getElementById('search_url').value = cleanUrl;
    }

    // 4. Main Regex (Limpia modificadores, fin de línea $, comillas dobles y almohadillas al importar)
    const regexMatch = commandStr.match(/"curl-impersonate"\s+"[^"]+"\s+"[^"]+"\s+'([^']+)'/);
    if (regexMatch) {
        let cleanRegex = regexMatch[1];
        if (cleanRegex.endsWith('si')) {
            document.getElementById('chk_regex_si').checked = true;
            cleanRegex = cleanRegex.slice(0, -2);
        } else {
            document.getElementById('chk_regex_si').checked = false;
        }
        if (cleanRegex.endsWith('$')) cleanRegex = cleanRegex.slice(0, -1);
        if (cleanRegex.startsWith('#') && cleanRegex.endsWith('#')) cleanRegex = cleanRegex.slice(1, -1);
        
        // Remover comillas dobles si envolvían completamente la expresión interna
        if (cleanRegex.startsWith('"') && cleanRegex.endsWith('"')) cleanRegex = cleanRegex.slice(1, -1);
        
        document.getElementById('main_regex').value = cleanRegex;
    }

    // 5. Parámetros explícitos
    const postMatch = commandStr.match(/--post\s+'([^']+)'/);
    document.getElementById('post_payload').value = postMatch ? postMatch[1] : '';

    const urlBuildMatch = commandStr.match(/--url-build-expression\s+"([^"]+)"/);
    document.getElementById('url_build').value = urlBuildMatch ? urlBuildMatch[1] : '';

    const headersMatch = commandStr.match(/--get-content-method-options\s+'([^']+)'/);
    document.getElementById('method_options').value = headersMatch ? headersMatch[1] : '';

    // 6. Checkboxes avanzados
    document.getElementById('chk_suggest').checked = commandStr.includes("--connection-type 'to_suggest'");
    document.getElementById('chk_ref').checked = commandStr.includes('--use-ref-as-ean');
    document.getElementById('chk_mpn').checked = commandStr.includes('--use-mpn-as-ean');
    document.getElementById('chk_title').checked = commandStr.includes('--search-value-expression {%Title}');

    // 7. Modos de confirmación
    const confFieldMatch = commandStr.match(/--confirmation-field\s+(\w+)/);
    if (confFieldMatch) {
        const rBtn = document.querySelector(`input[name="conf_field_type"][value="${confFieldMatch[1]}"]`);
        if (rBtn) rBtn.checked = true;
    } else {
        document.querySelector('input[name="conf_field_type"][value="NONE"]').checked = true;
    }

    // Confirmation Regex (Limpia modificadores, fin de línea $, comillas dobles y almohadillas al importar)
    const confRegexMatch = commandStr.match(/--confirmation-regex\s+'([^']+)'/);
    if (confRegexMatch) {
        let cleanConfRegex = confRegexMatch[1];
        if (cleanConfRegex.endsWith('si')) {
            document.getElementById('chk_conf_regex_si').checked = true;
            cleanConfRegex = cleanConfRegex.slice(0, -2);
        } else {
            document.getElementById('chk_conf_regex_si').checked = false;
        }
        if (cleanConfRegex.endsWith('$')) cleanConfRegex = cleanConfRegex.slice(0, -1);
        if (cleanConfRegex.startsWith('#') && cleanConfRegex.endsWith('#')) cleanConfRegex = cleanConfRegex.slice(1, -1);
        
        // Remover comillas dobles si envolvían completamente la expresión interna
        if (cleanConfRegex.startsWith('"') && cleanConfRegex.endsWith('"')) cleanConfRegex = cleanConfRegex.slice(1, -1);
        
        document.getElementById('conf_regex').value = cleanConfRegex;
    }

    // 8. Test Value
    const testValMatch = commandStr.match(/--test-value\s+(\d+)/);
    if (testValMatch) document.getElementById('test_value').value = testValMatch[1];

    importLocked = false;
    toggleRegexInput();

    if (extractedClient && extractedRival) {
        const match = cachedTeamCommands.find(c => c.client_id == extractedClient && c.rival_id == extractedRival);
        if (match) {
            setEditingState(match.id, extractedClient, extractedRival);
        } else {
            clearEditingState();
        }
    }
}

function generateCommand(mode) {
    if (importLocked) return document.getElementById('output').value;

    if (!getVal('client_store_id') && !getVal('rival_store_id') && !getVal('search_url') && getVal('main_regex') === 'url:"([^"]+)"') {
        return '';
    }

    let binary = (mode === 'test') ? "netrivals:ean-biter-by-store-id" : "netrivals:ean-biter-by-store-id-launcher";
    let controlVal = (mode === 'test') ? "0 1" : "10";

    let cmd = `${BASE_PHP} ${binary} ${getVal('client_store_id') || '[STORE_1]'} ${getVal('rival_store_id') || '[STORE_2]'} ${controlVal}`;
    cmd += ` "${FIXED_METHOD}"`;
    
    if (getVal('proxy')) cmd += ` "${getVal('proxy')}"`;
    
    if (getVal('search_url')) {
        cmd += ` "${getVal('search_url')}"`;
    }
    
    // Inyección automática de comillas dobles y caracteres "#" en la Regex Principal
    if (getVal('main_regex')) {
        let regexText = `#"${getVal('main_regex')}"#`;
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
        
        // Inyección automática de comillas dobles y caracteres "#" en la Confirmation Regex
        if (getVal('conf_regex')) {
            let confRegexText = `#"${getVal('conf_regex')}"#`;
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

// PERSISTENCIA EN SUPABASE
async function saveCommandToSupabase() {
    const editingId = document.getElementById('editing_command_id').value;
    const clientId = getVal('client_store_id');
    const rivalId = getVal('rival_store_id');

    if (!clientId || !rivalId) {
        alert('Please enter both Client StoreID and Rival StoreID.');
        return;
    }

    const payload = { 
        client_id: clientId, 
        rival_id: rivalId, 
        command_test: generateCommand('test'),       
        command_launcher: generateCommand('launcher'), 
        updated_at: new Date().toISOString()
    };

    if (editingId) {
        const { error } = await supabaseClient
            .from('biter_commands')
            .update(payload)
            .eq('id', editingId);

        if (error) {
            alert('Error updating configuration: ' + error.message);
        } else {
            alert(`Configuration for Client ${clientId} updated successfully! 📝☁️`);
            clearEditingState();
            await loadCommandsFromSupabase();
        }
    } else {
        const duplicate = cachedTeamCommands.find(c => c.client_id == clientId && c.rival_id == rivalId);
        if (duplicate) {
            if (confirm(`A configuration for Client ${clientId} and Rival ${rivalId} already exists. Do you want to overwrite it instead?`)) {
                setEditingState(duplicate.id, clientId, rivalId);
                saveCommandToSupabase();
                return;
            }
            return;
        }

        const { error } = await supabaseClient
            .from('biter_commands')
            .insert([payload]);

        if (error) {
            alert('Error saving configuration: ' + error.message);
        } else {
            alert(`New configuration for Client ${clientId} saved! 🚀☁️`);
            await loadCommandsFromSupabase();
        }
    }
}

async function loadCommandsFromSupabase() {
    const { data, error } = await supabaseClient
        .from('biter_commands')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        document.getElementById('history-list').innerHTML = `<div style="color: #f38ba8;">Error: ${error.message}</div>`;
        return;
    }

    cachedTeamCommands = data; 
    renderHistoryList(cachedTeamCommands);
}

function renderHistoryList(commands) {
    const listContainer = document.getElementById('history-list');
    if (commands.length === 0) {
        listContainer.innerHTML = `<div style="color: #a6adc8; font-size:12px;">No matches found.</div>`;
        return;
    }

    listContainer.innerHTML = '';
    commands.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const createdDate = new Date(item.created_at).toLocaleDateString('es-ES', options);
        const updatedDate = item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES', options) : null;

        const itemLabel = `Client: ${item.client_id} ➜ Rival: ${item.rival_id}`;
        const dateLabel = updatedDate && updatedDate !== createdDate ? `Edited: ${updatedDate}` : `Created: ${createdDate}`;

        div.innerHTML = `
            <div class="history-meta" style="display: flex; flex-direction: column; gap: 2px;">
                <span class="history-title" style="font-family: monospace; font-size: 11px;">${itemLabel}</span>
                <span style="font-size: 9px; color: #89b4fa;">${dateLabel}</span>
            </div>
            <button class="history-edit-btn" onclick="triggerLoadFromSidebar('${item.id}', \`${encodeURIComponent(item.command_launcher)}\`, '${item.client_id}', '${item.rival_id}')">✏️ Load</button>
        `;
        listContainer.appendChild(div);
    });
}

function triggerLoadFromSidebar(id, encodedCommand, clientId, rivalId) {
    const decodedCommand = decodeURIComponent(encodedCommand);
    document.getElementById('output').value = decodedCommand;
    analyzeAndParsePastedCommand(decodedCommand);
    
    document.getElementById('client_store_id').value = clientId;
    document.getElementById('rival_store_id').value = rivalId;
    
    setEditingState(id, clientId, rivalId);
}

function setEditingState(id, clientId, rivalId) {
    document.getElementById('editing_command_id').value = id;
    const saveBtn = document.getElementById('btn-cloud-save');
    saveBtn.innerText = `💾 Update Client ${clientId} vs ${rivalId} Config`;
    saveBtn.style.backgroundColor = '#89b4fa';
    document.getElementById('btn-cloud-cancel').classList.remove('hidden');
}

function clearEditingState() {
    document.getElementById('editing_command_id').value = '';
    const saveBtn = document.getElementById('btn-cloud-save');
    saveBtn.innerText = '☁️ Save Current Configuration as New';
    saveBtn.style.backgroundColor = '#a6e3a1';
    document.getElementById('btn-cloud-cancel').classList.add('hidden');
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

// FILTRO AVANZADO MULTI-TÉRMINO EN TIEMPO REAL (Admite buscar "ID_Cliente ID_Rival")
document.getElementById('search-history').addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    if (!query) {
        renderHistoryList(cachedTeamCommands);
        return;
    }
    
    // Divide lo que escribe el usuario por espacios (ej: ["123456", "78923"])
    const terms = query.split(/\s+/);
    
    const filtered = cachedTeamCommands.filter(c => {
        // Verifica que CADA término escrito coincida con el cliente O con el rival
        return terms.every(term => 
            c.client_id.toString().toLowerCase().includes(term) || 
            c.rival_id.toString().toLowerCase().includes(term)
        );
    });
    
    renderHistoryList(filtered);
});

// LISTENERS INTERNOS
document.getElementById('output').addEventListener('input', function() {
    analyzeAndParsePastedCommand(this.value);
});

['client_store_id', 'rival_store_id'].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            updateRealTimeView();
            
            const cId = getVal('client_store_id');
            const rId = getVal('rival_store_id');
            const match = cachedTeamCommands.find(c => c.client_id == cId && c.rival_id == rId);
            if (match) setEditingState(match.id, cId, rId);
            else clearEditingState();
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
loadCommandsFromSupabase();