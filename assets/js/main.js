// Cache data
let xeniumData = null;
let filteredData = null;

// DOM Elements
const projectFilter = document.getElementById('project-filter');
const brpFilter = document.getElementById('brp-filter');
const panelFilter = document.getElementById('panel-filter');
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

        // Update UI with data
        updateTimeEl.textContent = new Date(xeniumData.last_updated).toLocaleString();
        totalCountEl.textContent = xeniumData.file_count;

        // Populate filter options
        populateFilterOptions();

        // Initial display of all data
        filteredData = xeniumData.files;
        displayResults();

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

    xeniumData.files.forEach(file => {
        const meta = file.metadata;
        if (meta.project) projects.add(meta.project);
        if (meta.brp_id) brps.add(meta.brp_id);
        if (meta.panel) panels.add(meta.panel);
    });

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
}

// Filter data based on selections
function filterData() {
    if (!xeniumData) return;

    const projectValue = projectFilter.value;
    const brpValue = brpFilter.value;
    const panelValue = panelFilter.value;
    const searchValue = searchFilter.value.toLowerCase();

    filteredData = xeniumData.files.filter(file => {
        const meta = file.metadata;

        // Check each filter criteria
        if (projectValue && meta.project !== projectValue) return false;
        if (brpValue && meta.brp_id !== brpValue) return false;
        if (panelValue && meta.panel !== panelValue) return false;

        // Check search term against path
        if (searchValue && !file.s3_uri.toLowerCase().includes(searchValue)) return false;

        return true;
    });

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
                    <th>Project</th>
                    <th>Block ID</th>
                    <th>Panel</th>
                    <th>Date Modified</th>
                    <th>S3 URI</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredData.forEach(file => {
        const meta = file.metadata;
        tableHTML += `
            <tr>
                <td>${meta.project || '-'}</td>
                <td>${meta.brp_id || '-'}</td>
                <td>${meta.panel || '-'}</td>
                <td>${file.date} ${file.time}</td>
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
    navigator.clipboard.writeText(text).then(() => {
        // Show notification
        notification.textContent = 'Copied to clipboard!';
        notification.classList.add('show');

        // Hide notification after delay
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Reset all filters
function resetFilters() {
    projectFilter.value = '';
    brpFilter.value = '';
    panelFilter.value = '';
    searchFilter.value = '';

    if (xeniumData) {
        filteredData = xeniumData.files;
        displayResults();
    }
}

// Event listeners
projectFilter.addEventListener('change', filterData);
brpFilter.addEventListener('change', filterData);
panelFilter.addEventListener('change', filterData);
searchFilter.addEventListener('input', filterData);
resetButton.addEventListener('click', resetFilters);

// Initial data fetch
fetchData();

