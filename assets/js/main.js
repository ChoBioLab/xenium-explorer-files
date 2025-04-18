// Cache data
let xeniumData = null;
let filteredData = null;

// DOM Elements
const sourceTypeFilter = document.getElementById('source-type-filter');
const projectFilter = document.getElementById('project-filter');
const brpFilter = document.getElementById('brp-filter');
const panelFilter = document.getElementById('panel-filter');
const runIdFilter = document.getElementById('run-id-filter');
const dateFilter = document.getElementById('date-filter');
const searchFilter = document.getElementById('search-filter');
const resetButton = document.getElementById('reset-filters');
const resultsContainer = document.getElementById('results-container');
const filteredCountEl = document.getElementById('filtered-count');
const totalCountEl = document.getElementById('total-count');
const updateTimeEl = document.getElementById('update-time');
const notification = document.getElementById('notification');

// Fetch cache data
async function fetchData() {
    try {
        const response = await fetch('xenium_cache.json');
        xeniumData = await response.json();
        console.log("Cache data loaded:", xeniumData);

        // Update UI with data
        updateTimeEl.textContent = new Date(xeniumData.last_updated).toLocaleString();
        totalCountEl.textContent = xeniumData.file_count;

        // Populate filter options
        populateFilterOptions();

        // Initial display - default to only showing 'sopa' outputs
        sourceTypeFilter.value = 'sopa';
        filterData();

    } catch (error) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                Error loading cache data. Please check if the cache file exists or regenerate it.
            </div>
        `;
        console.error('Error fetching cache:', error);
    }
}

// Populate filter dropdowns based on available data
function populateFilterOptions() {
    // Extract unique values
    const projects = new Set();
    const brps = new Set();
    const panels = new Set();
    const runIds = new Set();
    const sourceTypes = new Set();

    xeniumData.files.forEach(file => {
        const meta = file.metadata;
        if (meta.source_type) sourceTypes.add(meta.source_type);
        if (meta.project) projects.add(meta.project);
        if (meta.brp_id) brps.add(meta.brp_id);
        if (meta.panel) panels.add(meta.panel);
        if (meta.run_id) runIds.add(meta.run_id);
    });

    console.log("Available source types:", [...sourceTypes]);
    console.log("Available run IDs:", [...runIds]);

    // Populate project filter
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectFilter.appendChild(option);
    });

    // Populate Block ID filter
    brps.forEach(brp => {
        const option = document.createElement('option');
        option.value = brp;
        option.textContent = brp;
        brpFilter.appendChild(option);
    });

    // Populate Panel filter
    panels.forEach(panel => {
        const option = document.createElement('option');
        option.value = panel;
        option.textContent = panel;
        panelFilter.appendChild(option);
    });

    // Populate Run ID filter
    runIds.forEach(runId => {
        const option = document.createElement('option');
        option.value = runId;
        option.textContent = runId;
        runIdFilter.appendChild(option);
    });
}

// Filter data based on selections
function filterData() {
    if (!xeniumData) return;

    const sourceTypeValue = sourceTypeFilter.value;
    const projectValue = projectFilter.value;
    const brpValue = brpFilter.value;
    const panelValue = panelFilter.value;
    const runIdValue = runIdFilter.value;
    const searchValue = searchFilter.value.toLowerCase();
    const dateValue = dateFilter.value; // Get date filter value

    console.log("Filtering with values:", {
        sourceType: sourceTypeValue,
        project: projectValue,
        brp: brpValue,
        panel: panelValue,
        runId: runIdValue,
        date: dateValue,
        search: searchValue
    });

    filteredData = xeniumData.files.filter(file => {
        const meta = file.metadata;

        // Check if metadata exists
        if (!meta) return false;

        // Check each filter criteria
        if (sourceTypeValue && meta.source_type !== sourceTypeValue) {
            return false;
        }

        if (projectValue && meta.project !== projectValue) {
            return false;
        }

        if (brpValue && meta.brp_id !== brpValue) {
            return false;
        }

        if (panelValue && meta.panel !== panelValue) {
            return false;
        }

        if (runIdValue && meta.run_id !== runIdValue) {
            return false;
        }

        // Apply date filter (for sopa sources only)
        if (dateValue && meta.source_type === 'sopa') {
            if (!meta.created_date || !meta.created_date.startsWith(dateValue)) {
                return false;
            }
        }

        // Check search term against path
        if (searchValue && !file.s3_uri.toLowerCase().includes(searchValue)) {
            return false;
        }

        return true;
    });

    console.log("Filtered data:", filteredData.length, "items");
    displayResults();
}

// Display filtered results
function displayResults() {
    filteredCountEl.textContent = filteredData.length;

    if (filteredData.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                No files match the current filters. Try adjusting your criteria.
            </div>
        `;
        return;
    }

    let tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Project</th>
                    <th>Block ID</th>
                    <th>Panel</th>
                    <th>Run ID</th>
                    <th>${sourceTypeFilter.value === 'sopa' ? 'Date Created' : 'Date Modified'}</th>
                    <th>S3 URI</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredData.forEach(file => {
        const meta = file.metadata || {};

        // Determine which date to display
        let displayDate = `${file.date} ${file.time}`;  // Default to modified date

        // For sopa sources, use created date if available
        if (meta.source_type === 'sopa' && meta.created_date) {
            displayDate = meta.created_date;
        }

        tableHTML += `
            <tr>
                <td>${meta.source_type || '-'}</td>
                <td>${meta.project || '-'}</td>
                <td>${meta.brp_id || '-'}</td>
                <td>${meta.panel || '-'}</td>
                <td>${meta.run_id || '-'}</td>
                <td>${displayDate}</td>
                <td class="s3-uri">${file.s3_uri}</td>
                <td>
                    <button class="copy-btn" data-uri="${file.s3_uri}">Copy URI</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    resultsContainer.innerHTML = tableHTML;

    // Add event listeners to copy buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const uri = button.getAttribute('data-uri');
            copyToClipboard(uri);
        });
    });
}

// Copy text to clipboard
function copyToClipboard(text) {
    // Try using the Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showNotification('Copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy with Clipboard API: ', err);
                fallbackCopyToClipboard(text);
            });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Make it non-editable to avoid focus and move outside the screen
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';

    document.body.appendChild(textarea);

    // Select the text in the textarea
    textarea.select();

    try {
        // Execute the copy command
        const success = document.execCommand('copy');
        if (success) {
            showNotification('Copied to clipboard!');
        } else {
            showNotification('Copy failed. Please copy manually.');
        }
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        showNotification('Copy failed. Please copy manually.');
    }

    document.body.removeChild(textarea);
}

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Reset all filters
function resetFilters() {
    sourceTypeFilter.value = 'sopa'; // Default to 'sopa' only
    projectFilter.value = '';
    brpFilter.value = '';
    panelFilter.value = '';
    runIdFilter.value = '';
    searchFilter.value = '';
    dateFilter.value = ''; // Reset date filter

    filterData();
}

// Event listeners
sourceTypeFilter.addEventListener('change', filterData);
projectFilter.addEventListener('change', filterData);
brpFilter.addEventListener('change', filterData);
panelFilter.addEventListener('change', filterData);
runIdFilter.addEventListener('change', filterData);
searchFilter.addEventListener('input', filterData);
dateFilter.addEventListener('change', filterData);
resetButton.addEventListener('click', resetFilters);

// Initial data fetch
fetchData();

