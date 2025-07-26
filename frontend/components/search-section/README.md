# Search Section Web Component

A powerful, reusable Web Component that provides a complete search interface with filtering capabilities. Built with vanilla JavaScript and Shadow DOM for perfect encapsulation and reusability.

## 🚀 Features

- **Shadow DOM Encapsulation**: Complete CSS and JavaScript isolation
- **Multiple Instances**: Run multiple search interfaces on the same page
- **Configurable Filters**: Pre-apply filters via HTML attributes
- **Independent State**: Each instance maintains its own search results and state
- **Reactive Attributes**: Dynamic updates when attributes change
- **AI Search Support**: Toggle between standard and semantic search
- **Mobile Responsive**: Adaptive design for all screen sizes
- **Performance Optimized**: DOM caching, debounced inputs, and efficient rendering
- **Loading States**: Skeleton loading animations and error handling

## 📦 Installation

### Script Tag (Recommended)
```html
<script src="./search-section-component.js"></script>
```

### ES6 Module Import (If using modules)
```javascript
// Component is automatically registered when script loads
// Access via window.SearchSection if needed
```

## 🎯 Basic Usage

```html
<!-- All documents -->
<search-section filter-type="all"></search-section>

<!-- User-specific documents -->
<search-section filter-type="user" filter-value="john123"></search-section>

<!-- Category with default filters -->
<search-section 
    filter-type="category" 
    filter-value="documents" 
    default-filters='{"status":"active"}'>
</search-section>
```

## 🔧 Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter-type` | string | `"all"` | Type of filter to apply: "all", "user", "category", etc. |
| `filter-value` | string | `null` | Value to filter by (only used when filter-type ≠ "all") |
| `default-filters` | JSON string | `{}` | Default filters to apply on initialization |
| `api-base` | string | `"https://symbia.it:5000"` | Custom API base URL |

### Example with All Attributes
```html
<search-section 
    filter-type="category"
    filter-value="documents"
    default-filters='{"language":"italian","priceType":"free"}'
    api-base="https://api.example.com">
</search-section>
```

## 📋 Filter Types

### Backend Filters (Server-side)
Applied during API calls for optimal performance:
- `course` - Filter by course name
- `faculty` - Filter by faculty
- `canale` - Filter by channel
- `language` - Filter by document language
- `tag` - Filter by document tags
- `documentType` - Filter by file format
- `academicYear` - Filter by academic year
- `courseYear` - Filter by course year

### Client-side Filters
Applied to already-loaded results:
- `priceType` - "all", "free", or "paid"
- `minRating` - Minimum rating threshold
- `minPages` / `maxPages` - Page count range

## 🎨 Styling

The component uses Shadow DOM, so styles are completely encapsulated. The component includes:

- **Responsive Grid Layout**: Automatic sizing based on screen width
- **Modern Card Design**: Clean, professional document cards
- **Loading Animations**: Skeleton loading states
- **Interactive Elements**: Hover effects and smooth transitions
- **Dark/Light Theme Support**: CSS custom properties for easy theming

### Custom CSS Properties
```css
search-section {
    --primary-color: #0ea5e9;
    --secondary-color: #7c3aed;
    --success-color: #10b981;
    --error-color: #ef4444;
    --text-color: #1f2937;
    --background-color: #ffffff;
}
```

## 🔄 Lifecycle Methods

The component implements all standard Web Component lifecycle methods:

```javascript
// Called when element is connected to DOM
connectedCallback()

// Called when element is disconnected from DOM
disconnectedCallback()

// Called when observed attributes change
attributeChangedCallback(name, oldValue, newValue)

// List of attributes to observe
static get observedAttributes()
```

## 📡 API Integration

### Default Endpoints
- `GET /vetrine` - Load all documents
- `POST /vetrine/search` - Search with query and filters
- `GET /hierarchy` - Load faculty/course hierarchy
- `GET /tags` - Load available tags

### Authentication
The component automatically uses the `authToken` from localStorage if available:

```javascript
// Token is automatically included in API requests
localStorage.setItem('authToken', 'your-jwt-token');
```

### Custom API Configuration
```html
<search-section api-base="https://your-api.com"></search-section>
```

## 🎪 Multiple Instances Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Multiple Search Instances</title>
</head>
<body>
    <!-- Instance 1: All documents -->
    <search-section filter-type="all"></search-section>
    
    <!-- Instance 2: Free documents only -->
    <search-section 
        filter-type="all" 
        default-filters='{"priceType":"free"}'>
    </search-section>
    
    <!-- Instance 3: Specific user documents -->
    <search-section 
        filter-type="user" 
        filter-value="john123">
    </search-section>
    
    <!-- Instance 4: Category with custom API -->
    <search-section 
        filter-type="category"
        filter-value="engineering"
        api-base="https://staging-api.example.com">
    </search-section>
    
    <script src="./search-section-component.js"></script>
</body>
</html>
```

## 🔍 Advanced Usage

### Programmatic Control
```javascript
// Get component reference
const searchComponent = document.querySelector('search-section');

// Change filters programmatically
searchComponent.setAttribute('filter-type', 'category');
searchComponent.setAttribute('filter-value', 'science');

// Listen to component events
searchComponent.addEventListener('search-complete', (event) => {
    console.log('Search completed:', event.detail);
});

// Access component methods
searchComponent.performSearch('machine learning');
```

### Dynamic Filter Updates
```javascript
// Component automatically reacts to attribute changes
const component = document.querySelector('search-section');

// This will trigger a re-render with new filters
component.setAttribute('default-filters', 
    JSON.stringify({
        language: 'english',
        priceType: 'paid',
        minRating: 4
    })
);
```

## 🐛 Debugging

### Enable Debug Mode
```javascript
// In browser console
localStorage.setItem('debug', 'true');
// Reload page to see detailed logs
```

### Component State Inspection
```javascript
// Access component instance
const component = document.querySelector('search-section');

// View current state
console.log('Current files:', component.state.currentFiles);
console.log('Active filters:', component.state.filters);
console.log('Configuration:', component.config);
```

## 🔧 Development

### Project Structure
```
search-section/
├── search-section-component.js    # Main component file
├── search-section.html           # Original HTML template
├── search-section.css            # Original styles
├── search-section.js             # Original JavaScript
├── example-usage.html            # Usage examples
└── README.md                     # This documentation
```

### Building from Source
The component is built from the original files:
1. **HTML**: Extracted and converted to Shadow DOM template
2. **CSS**: Embedded as scoped styles within the component
3. **JavaScript**: Refactored to work within Web Component lifecycle

### Browser Support
- **Modern Browsers**: Chrome 54+, Firefox 63+, Safari 12+, Edge 79+
- **Web Components**: Requires native support or polyfill
- **ES6 Features**: Uses modern JavaScript (classes, arrow functions, etc.)

## 📝 Migration Guide

### From Original Implementation
If you're migrating from the original `search-section.html/css/js` files:

1. **Replace HTML**: 
   ```html
   <!-- OLD -->
   <div class="search-section">...</div>
   
   <!-- NEW -->
   <search-section filter-type="all"></search-section>
   ```

2. **Remove CSS/JS Imports**:
   ```html
   <!-- Remove these -->
   <link rel="stylesheet" href="search-section.css">
   <script src="search-section.js"></script>
   
   <!-- Add this -->
   <script src="search-section-component.js"></script>
   ```

3. **Update Global References**:
   ```javascript
   // OLD
   const searchSection = document.querySelector('.search-section');
   
   // NEW
   const searchSection = document.querySelector('search-section');
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Test with multiple instances
5. Submit a pull request

## 📄 License

This project is part of the Uniclarity marketplace platform. All rights reserved.

## 🆘 Support

For issues and questions:
1. Check the example usage file
2. Enable debug mode for detailed logs
3. Open an issue with component state and configuration details

---

**Made with ❤️ for the Uniclarity platform**