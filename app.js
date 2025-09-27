// Constants
const CITY_CENTER = [40.7128, -74.0060]; // Default city center (NYC)
const INITIAL_ZOOM = 13;
const UPDATE_INTERVAL = 5000; // Update vehicle positions every 5 seconds

// Helper function to generate random coordinates near a center point
const getRandomPosition = (center, radius = 0.02) => {
  return [
    center[0] + (Math.random() - 0.5) * radius,
    center[1] + (Math.random() - 0.5) * radius,
  ];
};

// Helper function to generate random routes
const generateInitialRoutes = () => {
  const routes = [
    { id: "B1", routeNumber: "B1", type: "Bus", color: "#3B82F6" },
    { id: "B2", routeNumber: "B2", type: "Bus", color: "#10B981" },
    { id: "T1", routeNumber: "T1", type: "Train", color: "#EF4444" },
    { id: "T2", routeNumber: "T2", type: "Train", color: "#F59E0B" },
  ];

  return routes.map(route => {
    const status = Math.random() > 0.7 ? "Delayed" : Math.random() > 0.3 ? "On Time" : "Early";
    const delayInMinutes = status === "Delayed" ? Math.floor(Math.random() * 15) + 1 : 
                          status === "Early" ? -Math.floor(Math.random() * 5) : 0;
    
    return {
      ...route,
      currentPosition: getRandomPosition(CITY_CENTER),
      status,
      delayInMinutes,
      isWheelchairAccessible: Math.random() > 0.3,
      direction: Math.random() * 360,
      speed: 0.0002 + Math.random() * 0.0003,
    };
  });
};

// Mock transit locations data
const transitStops = [
  { id: "stop1", name: "Downtown Terminal", position: [40.7128, -74.0060], routes: ["B1", "B2", "T1"] },
  { id: "stop2", name: "North Station", position: [40.7328, -74.0160], routes: ["B1", "T1", "T2"] },
  { id: "stop3", name: "East Village", position: [40.7228, -73.9860], routes: ["B2", "T2"] },
  { id: "stop4", name: "West Plaza", position: [40.7028, -74.0260], routes: ["B1", "B2"] },
  { id: "stop5", name: "South Harbor", position: [40.6928, -74.0000], routes: ["T1", "T2"] },
];

// App Component
const App = () => {
  // State
  const [vehicles, setVehicles] = React.useState(generateInitialRoutes());
  const [darkMode, setDarkMode] = React.useState(true);
  const [isPanelOpen, setIsPanelOpen] = React.useState(true);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = React.useState(false);
  const [highContrastMode, setHighContrastMode] = React.useState(false);
  const [fontSizeModifier, setFontSizeModifier] = React.useState(0);
  const [accessibleRoutesOnly, setAccessibleRoutesOnly] = React.useState(false);
  const [startLocation, setStartLocation] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [timeSaving, setTimeSaving] = React.useState(false);
  const [fuelSaving, setFuelSaving] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState([]);
  const [map, setMap] = React.useState(null);
  const [markers, setMarkers] = React.useState([]);

  // Refs
  const mapContainerRef = React.useRef(null);

  // Initialize map
  React.useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = L.map(mapContainerRef.current).setView(CITY_CENTER, INITIAL_ZOOM);
    
    // Use different map tiles based on dark/light mode
    const tileUrl = darkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    L.tileLayer(tileUrl, {
      attribution: darkMode 
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Add stop markers
    transitStops.forEach(stop => {
      const stopMarker = L.circle(stop.position, {
        color: '#6366F1',
        fillColor: '#4F46E5',
        fillOpacity: 0.6,
        radius: 100
      }).addTo(mapInstance);
      
      stopMarker.bindPopup(`<b>${stop.name}</b><br>Routes: ${stop.routes.join(', ')}`);
    });

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, [darkMode]);

  // Update vehicle positions periodically
  React.useEffect(() => {
    const updateVehiclePositions = () => {
      setVehicles(prevVehicles => 
        prevVehicles.map(vehicle => {
          // Random movement based on direction and speed
          const radians = vehicle.direction * Math.PI / 180;
          const newLat = vehicle.currentPosition[0] + Math.cos(radians) * vehicle.speed;
          const newLng = vehicle.currentPosition[1] + Math.sin(radians) * vehicle.speed;
          
          // Randomly change direction occasionally
          const newDirection = Math.random() > 0.8 
            ? (vehicle.direction + (Math.random() * 60 - 30)) % 360 
            : vehicle.direction;
          
          // Randomly change status occasionally
          const shouldChangeStatus = Math.random() > 0.9;
          const newStatus = shouldChangeStatus
            ? ["On Time", "Delayed", "Early"][Math.floor(Math.random() * 3)]
            : vehicle.status;
          
          // Update delay minutes based on status
          let newDelayInMinutes = vehicle.delayInMinutes;
          if (shouldChangeStatus) {
            newDelayInMinutes = newStatus === "Delayed" ? Math.floor(Math.random() * 15) + 1 : 
                               newStatus === "Early" ? -Math.floor(Math.random() * 5) : 0;
          }
          
          return {
            ...vehicle,
            currentPosition: [newLat, newLng],
            direction: newDirection,
            status: newStatus,
            delayInMinutes: newDelayInMinutes,
          };
        })
      );
    };

    const interval = setInterval(updateVehiclePositions, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Update map markers when vehicles change or map initializes
  React.useEffect(() => {
    if (!map) return;
    
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    
    // Add new markers
    const newMarkers = vehicles.map(vehicle => {
      // Determine icon color based on status
      const color = vehicle.status === "Delayed" ? "#EF4444" : 
                   vehicle.status === "Early" ? "#10B981" : "#3B82F6";
      
      // Create custom icon
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: ${vehicle.type === 'Bus' ? '0%' : '50%'};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">${vehicle.routeNumber}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      
      // Create and add marker
      const marker = L.marker(vehicle.currentPosition, { icon }).addTo(map);
      
      // Add popup
      marker.bindPopup(`
        <b>${vehicle.type} ${vehicle.routeNumber}</b><br>
        Status: ${vehicle.status}<br>
        ${vehicle.delayInMinutes > 0 ? `Delay: +${vehicle.delayInMinutes} min` : 
          vehicle.delayInMinutes < 0 ? `Early: ${-vehicle.delayInMinutes} min` : 'On time'}<br>
        ${vehicle.isWheelchairAccessible ? '♿ Wheelchair accessible' : 'Not wheelchair accessible'}
      `);
      
      return marker;
    });
    
    setMarkers(newMarkers);
  }, [vehicles, map]);

  // Handle search
  const handleSearch = () => {
    if (!startLocation || !destination) return;
    
    // Simulate search results
    const generateRoutes = () => {
      const baseRoutes = [
        {
          id: 1,
          routeNumber: "B1 > T1",
          type: "Bus + Train",
          estimatedArrival: "10:30 AM",
          delayMinutes: 3,
          transfers: 1,
          isWheelchairAccessible: true,
          duration: 25,
        },
        {
          id: 2,
          routeNumber: "T2",
          type: "Train",
          estimatedArrival: "10:38 AM",
          delayMinutes: 0,
          transfers: 0,
          isWheelchairAccessible: true,
          duration: 22,
        },
        {
          id: 3,
          routeNumber: "B2 > B1",
          type: "Bus",
          estimatedArrival: "10:45 AM",
          delayMinutes: 8,
          transfers: 1,
          isWheelchairAccessible: false,
          duration: 30,
        },
      ];

      // Filter for accessible routes if needed
      let routes = accessibleRoutesOnly 
        ? baseRoutes.filter(route => route.isWheelchairAccessible) 
        : baseRoutes;
      
      // Sort based on preferences
      if (timeSaving) {
        routes = [...routes].sort((a, b) => (a.duration + a.delayMinutes) - (b.duration + b.delayMinutes));
      } else if (fuelSaving) {
        routes = [...routes].sort((a, b) => a.transfers - b.transfers);
      }
      
      return routes;
    };
    
    setSearchResults(generateRoutes());
  };

  // Determine font size class based on modifier
  const fontSizeClass = React.useMemo(() => {
    switch (fontSizeModifier) {
      case -1: return "text-sm";
      case 1: return "text-lg";
      case 2: return "text-xl";
      default: return "text-base";
    }
  }, [fontSizeModifier]);

  // Theme classes
  const themeClasses = React.useMemo(() => {
    if (highContrastMode) {
      return {
        background: "bg-black",
        panel: "bg-black border-2 border-yellow-400",
        text: "text-yellow-400",
        input: "bg-black text-yellow-400 border-2 border-yellow-400",
        button: "bg-yellow-400 text-black hover:bg-yellow-300",
        card: "bg-black border-2 border-yellow-400",
      };
    }
    
    return {
      background: darkMode ? "bg-gray-900" : "bg-gray-100",
      panel: darkMode ? "bg-gray-800 bg-opacity-90" : "bg-white bg-opacity-90",
      text: darkMode ? "text-white" : "text-gray-800",
      input: darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-800",
      button: darkMode ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-blue-500 text-white hover:bg-blue-600",
      card: darkMode ? "bg-gray-700" : "bg-white",
    };
  }, [darkMode, highContrastMode]);

  return (
    <div className={`h-full w-full ${themeClasses.background} ${fontSizeClass}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="map-container absolute inset-0"></div>
      
      {/* Search Panel */}
      <div className={`absolute top-0 left-0 h-full ${isPanelOpen ? 'w-80' : 'w-12'} transition-all duration-300 ease-in-out`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`absolute top-4 right-0 transform translate-x-full z-10 p-2 ${themeClasses.button} rounded-r-md`}
        >
          {isPanelOpen ? '◀' : '▶'}
        </button>
        
        {/* Panel Content */}
        {isPanelOpen && (
          <div className={`h-full ${themeClasses.panel} p-4 overflow-y-auto shadow-xl`}>
            <h1 className={`text-2xl font-bold mb-6 ${themeClasses.text}`}>TransitFlow</h1>
            
            {/* Search Form */}
            <div className="mb-6">
              <div className="mb-4">
                <label className={`block mb-2 ${themeClasses.text}`}>Start Location</label>
                <input
                  type="text"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="Enter start location"
                  className={`w-full p-2 rounded-md ${themeClasses.input}`}
                />
              </div>
              
              <div className="mb-4">
                <label className={`block mb-2 ${themeClasses.text}`}>Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Enter destination"
                  className={`w-full p-2 rounded-md ${themeClasses.input}`}
                />
              </div>
              
              <div className="flex space-x-4 mb-4">
                <label className={`flex items-center ${themeClasses.text}`}>
                  <input
                    type="checkbox"
                    checked={timeSaving}
                    onChange={() => setTimeSaving(!timeSaving)}
                    className="mr-2"
                  />
                  Time Saving
                </label>
                
                <label className={`flex items-center ${themeClasses.text}`}>
                  <input
                    type="checkbox"
                    checked={fuelSaving}
                    onChange={() => setFuelSaving(!fuelSaving)}
                    className="mr-2"
                  />
                  Fewer Transfers
                </label>
              </div>
              
              <button
                onClick={handleSearch}
                className={`w-full py-2 px-4 rounded-md ${themeClasses.button}`}
              >
                Find Routes
              </button>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${themeClasses.text}`}>Route Options</h2>
                
                {searchResults.map((route) => (
                  <div
                    key={route.id}
                    className={`${themeClasses.card} rounded-md p-3 mb-3 shadow-md`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold ${themeClasses.text}`}>{route.routeNumber}</span>
                      <span className={`text-sm ${themeClasses.text}`}>{route.type}</span>
                    </div>
                    
                    <div className={`text-sm mb-2 ${themeClasses.text}`}>
                      Arrival: {route.estimatedArrival}
                    </div>
                    
                    <div className={`${
                      route.delayMinutes > 5 ? 'text-red-500' : 
                      route.delayMinutes > 0 ? 'text-yellow-500' : 'text-green-500'
                    } font-medium mb-2`}>
                      {route.delayMinutes > 0 
                        ? `+${route.delayMinutes} min delay` 
                        : 'On time'}
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className={`${themeClasses.text}`}>
                        {route.transfers === 0 ? 'Direct route' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`}
                      </span>
                      
                      {route.isWheelchairAccessible && (
                        <span className={`${themeClasses.text}`}>♿</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Accessibility Button */}
      <button
        onClick={() => setIsAccessibilityOpen(true)}
        className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500"
        aria-label="Accessibility options"
      >
        ♿
      </button>
      
      {/* Accessibility Modal */}
      {isAccessibilityOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className={`${themeClasses.panel} p-6 rounded-lg shadow-xl max-w-md w-full`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${themeClasses.text}`}>Accessibility Options</h2>
              <button
                onClick={() => setIsAccessibilityOpen(false)}
                className={`${themeClasses.text}`}
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className={`${themeClasses.text}`}>High Contrast Mode</label>
                <div className="relative inline-block w-12 align-middle select-none">
                  <input
                    type="checkbox"
                    checked={highContrastMode}
                    onChange={() => setHighContrastMode(!highContrastMode)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label
                    className={`toggle-label block overflow-hidden h-6 rounded-full ${
                      highContrastMode ? 'bg-yellow-400' : 'bg-gray-300'
                    } cursor-pointer`}
                  ></label>
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 ${themeClasses.text}`}>Font Size</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFontSizeModifier(Math.max(-1, fontSizeModifier - 1))}
                    className={`py-1 px-3 rounded ${themeClasses.button}`}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSizeModifier(0)}
                    className={`py-1 px-3 rounded ${themeClasses.button}`}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setFontSizeModifier(Math.min(2, fontSizeModifier + 1))}
                    className={`py-1 px-3 rounded ${themeClasses.button}`}
                  >
                    A+
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className={`${themeClasses.text}`}>Show Accessible Routes Only</label>
                <div className="relative inline-block w-12 align-middle select-none">
                  <input
                    type="checkbox"
                    checked={accessibleRoutesOnly}
                    onChange={() => setAccessibleRoutesOnly(!accessibleRoutesOnly)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label
                    className={`toggle-label block overflow-hidden h-6 rounded-full ${
                      accessibleRoutesOnly ? 'bg-blue-600' : 'bg-gray-300'
                    } cursor-pointer`}
                  ></label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom styles for toggles */}
      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          transform: translateX(100%);
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #4CAF50;
        }
        .toggle-checkbox {
          right: 50%;
          transition: all 0.3s;
        }
        .toggle-label {
          transition: all 0.3s;
        }
      `}</style>
    </div>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));
