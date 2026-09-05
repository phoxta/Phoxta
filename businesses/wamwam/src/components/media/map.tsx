import type { Feature, FeatureCollection, GeoJsonProperties, Point } from "geojson";
import { Loader2, Locate, Maximize, Minus, Plus, X } from "lucide-react";
import type {
    GeoJSONSource,
    Map as MapLibreMap,
    MapGeoJSONFeature,
    MapMouseEvent,
    MapOptions,
    Marker as MapLibreMarker,
    MarkerOptions,
    PointLike,
    Popup as MapLibrePopup,
    PopupOptions,
    ProjectionSpecification,
    StyleSpecification,
} from "maplibre-gl";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type Ref,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/** The maplibre-gl module namespace. Only ever referenced as a type here. */
type MapLibreModule = typeof import("maplibre-gl");

let maplibreLoad: Promise<MapLibreModule> | null = null;

/**
 * maplibre-gl is ~1 MB of JS plus ~70 kB of CSS. Imported statically it lands in
 * the chunk of every page that can reach a listing, map or no map; loading it
 * from the map's own mount effect means only a page that actually paints a map
 * pays for it. The promise is module-level so several maps mounting together
 * (a search page, a detail page with a mini-map) share one fetch.
 */
function loadMapLibre(): Promise<MapLibreModule> {
    if (!maplibreLoad) {
        maplibreLoad = Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css")]).then(([mod]) => {
            // The published bundle is UMD, so depending on the interop the library
            // arrives either as named exports or on `default`.
            const ns = mod as MapLibreModule & { default?: MapLibreModule };
            return ns.default ?? ns;
        });
    }
    return maplibreLoad;
}

const defaultStyles = {
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type Theme = "light" | "dark";

// Check document class for theme (works with next-themes, etc.)
function getDocumentTheme(): Theme | null {
    if (typeof document === "undefined") return null;
    if (document.documentElement.classList.contains("dark")) return "dark";
    if (document.documentElement.classList.contains("light")) return "light";
    return null;
}

// Get system preference
function getSystemTheme(): Theme {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useResolvedTheme(themeProp?: "light" | "dark"): Theme {
    const [detectedTheme, setDetectedTheme] = useState<Theme>(() => getDocumentTheme() ?? getSystemTheme());

    useEffect(() => {
        if (themeProp) return; // Skip detection if theme is provided via prop

        // Watch for document class changes (the theme provider toggles `dark`)
        const observer = new MutationObserver(() => {
            const docTheme = getDocumentTheme();
            if (docTheme) {
                setDetectedTheme(docTheme);
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        // Also watch for system preference changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemChange = (e: MediaQueryListEvent) => {
            // Only use system preference if no document class is set
            if (!getDocumentTheme()) {
                setDetectedTheme(e.matches ? "dark" : "light");
            }
        };
        mediaQuery.addEventListener("change", handleSystemChange);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener("change", handleSystemChange);
        };
    }, [themeProp]);

    return themeProp ?? detectedTheme;
}

type MapContextValue = {
    map: MapLibreMap | null;
    isLoaded: boolean;
    /** Resolved once the lazy import lands. Children render only after that. */
    maplibre: MapLibreModule | null;
};

const MapContext = createContext<MapContextValue | null>(null);

function useMap() {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error("useMap must be used within a Map component");
    }
    return context;
}

/** Map viewport state */
type MapViewport = {
    /** Center coordinates [longitude, latitude] */
    center: [number, number];
    /** Zoom level */
    zoom: number;
    /** Bearing (rotation) in degrees */
    bearing: number;
    /** Pitch (tilt) in degrees */
    pitch: number;
};

type MapStyleOption = string | StyleSpecification;

type MapRef = MapLibreMap;

type MapProps = {
    children?: ReactNode;
    /** Additional CSS classes for the map container */
    className?: string;
    /** Exposes the underlying maplibre `Map` once it exists. */
    ref?: Ref<MapRef | null>;
    /**
     * Theme for the map. If not provided, automatically detects system preference.
     * Pass your theme value here.
     */
    theme?: Theme;
    /** Custom map styles for light and dark themes. Overrides the default Carto styles. */
    styles?: {
        light?: MapStyleOption;
        dark?: MapStyleOption;
    };
    /** Map projection type. Use `{ type: "globe" }` for 3D globe view. */
    projection?: ProjectionSpecification;
    /**
     * Controlled viewport. When provided with onViewportChange,
     * the map becomes controlled and viewport is driven by this prop.
     */
    viewport?: Partial<MapViewport>;
    /**
     * Callback fired continuously as the viewport changes (pan, zoom, rotate, pitch).
     * Can be used standalone to observe changes, or with `viewport` prop
     * to enable controlled mode where the map viewport is driven by your state.
     */
    onViewportChange?: (viewport: MapViewport) => void;
} & Omit<MapOptions, "container" | "style">;

function DefaultLoader() {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1">
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
            </div>
        </div>
    );
}

function getViewport(map: MapLibreMap): MapViewport {
    const center = map.getCenter();
    return {
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
    };
}

function Map({ children, className, theme: themeProp, styles, projection, viewport, onViewportChange, ref, ...props }: MapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [maplibre, setMaplibre] = useState<MapLibreModule | null>(null);
    const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isStyleLoaded, setIsStyleLoaded] = useState(false);
    const currentStyleRef = useRef<MapStyleOption | null>(null);
    const styleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const internalUpdateRef = useRef(false);
    const resolvedTheme = useResolvedTheme(themeProp);

    const isControlled = viewport !== undefined && onViewportChange !== undefined;

    const onViewportChangeRef = useRef(onViewportChange);
    onViewportChangeRef.current = onViewportChange;

    const mapStyles = useMemo(
        () => ({
            dark: styles?.dark ?? defaultStyles.dark,
            light: styles?.light ?? defaultStyles.light,
        }),
        [styles],
    );

    // Expose the map instance to the parent. Null until the deferred maplibre
    // import resolves and the map is constructed — the ref type says so rather
    // than casting the null away.
    useImperativeHandle<MapRef | null, MapRef | null>(ref, () => mapInstance, [mapInstance]);

    const clearStyleTimeout = useCallback(() => {
        if (styleTimeoutRef.current) {
            clearTimeout(styleTimeoutRef.current);
            styleTimeoutRef.current = null;
        }
    }, []);

    // The map reads its ~60 MapOptions exactly once, when it is constructed, and
    // never observes them again: making them reactive would tear the map down and
    // rebuild it on every prop identity change. Only the controlled `viewport` and
    // the theme style are kept in sync afterwards, by the two effects below. This
    // ref exists purely because construction now happens after an async import —
    // it is not a licence for the options to become live.
    const initRef = useRef({ options: props, viewport, projection, resolvedTheme, mapStyles });
    initRef.current = { options: props, viewport, projection, resolvedTheme, mapStyles };

    // Initialize the map
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let disposed = false;
        let teardown: (() => void) | null = null;

        void loadMapLibre().then(
            (maplibreModule) => {
                if (disposed) return;

                const {
                    options,
                    viewport: initialViewport,
                    projection: initialProjection,
                    resolvedTheme: initialTheme,
                    mapStyles: initialStyles,
                } = initRef.current;

                const initialStyle = initialTheme === "dark" ? initialStyles.dark : initialStyles.light;
                currentStyleRef.current = initialStyle;

                const map = new maplibreModule.Map({
                    container,
                    style: initialStyle,
                    renderWorldCopies: false,
                    attributionControl: {
                        compact: true,
                    },
                    ...options,
                    ...initialViewport,
                });

                const styleDataHandler = () => {
                    clearStyleTimeout();
                    // Delay to ensure style is fully processed before allowing layer operations
                    // This is a workaround to avoid race conditions with the style loading
                    // else we have to force update every layer on setStyle change
                    styleTimeoutRef.current = setTimeout(() => {
                        setIsStyleLoaded(true);
                        if (initialProjection) {
                            map.setProjection(initialProjection);
                        }
                    }, 100);
                };
                const loadHandler = () => setIsLoaded(true);

                // Viewport change handler - skip if triggered by internal update
                const handleMove = () => {
                    if (internalUpdateRef.current) return;
                    onViewportChangeRef.current?.(getViewport(map));
                };

                map.on("load", loadHandler);
                map.on("styledata", styleDataHandler);
                map.on("move", handleMove);
                setMaplibre(maplibreModule);
                setMapInstance(map);

                teardown = () => {
                    clearStyleTimeout();
                    map.off("load", loadHandler);
                    map.off("styledata", styleDataHandler);
                    map.off("move", handleMove);
                    map.remove();
                    setIsLoaded(false);
                    setIsStyleLoaded(false);
                    setMapInstance(null);
                    setMaplibre(null);
                };
            },
            () => {
                // The library chunk failed to fetch. Nothing was built, so there is
                // nothing to tear down; the loader stays up.
            },
        );

        return () => {
            disposed = true;
            teardown?.();
            teardown = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync controlled viewport to map
    useEffect(() => {
        if (!mapInstance || !isControlled || !viewport) return;
        if (mapInstance.isMoving()) return;

        const current = getViewport(mapInstance);
        const next = {
            center: viewport.center ?? current.center,
            zoom: viewport.zoom ?? current.zoom,
            bearing: viewport.bearing ?? current.bearing,
            pitch: viewport.pitch ?? current.pitch,
        };

        if (
            next.center[0] === current.center[0] &&
            next.center[1] === current.center[1] &&
            next.zoom === current.zoom &&
            next.bearing === current.bearing &&
            next.pitch === current.pitch
        ) {
            return;
        }

        internalUpdateRef.current = true;
        mapInstance.jumpTo(next);
        internalUpdateRef.current = false;
    }, [mapInstance, isControlled, viewport]);

    // Handle style change
    useEffect(() => {
        if (!mapInstance || !resolvedTheme) return;

        const newStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;

        if (currentStyleRef.current === newStyle) return;

        clearStyleTimeout();
        currentStyleRef.current = newStyle;
        setIsStyleLoaded(false);

        mapInstance.setStyle(newStyle, { diff: true });
    }, [mapInstance, resolvedTheme, mapStyles, clearStyleTimeout]);

    const contextValue = useMemo(
        () => ({
            map: mapInstance,
            isLoaded: isLoaded && isStyleLoaded,
            maplibre,
        }),
        [mapInstance, isLoaded, isStyleLoaded, maplibre],
    );

    return (
        <MapContext.Provider value={contextValue}>
            <div ref={containerRef} className={cn("relative h-full w-full", className)}>
                {!isLoaded && <DefaultLoader />}
                {/* Children need a live map instance, so they wait for the lazy import */}
                {mapInstance && children}
            </div>
        </MapContext.Provider>
    );
}

type MarkerContextValue = {
    marker: MapLibreMarker;
    map: MapLibreMap;
    maplibre: MapLibreModule;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
    const context = useContext(MarkerContext);
    if (!context) {
        throw new Error("Marker components must be used within MapMarker");
    }
    return context;
}

type MapMarkerProps = {
    /** Longitude coordinate for marker position */
    longitude: number;
    /** Latitude coordinate for marker position */
    latitude: number;
    /** Marker subcomponents (MarkerContent, MarkerPopup, MarkerTooltip, MarkerLabel) */
    children: ReactNode;
    /** Callback when marker is clicked */
    onClick?: (e: MouseEvent) => void;
    /** Callback when mouse enters marker */
    onMouseEnter?: (e: MouseEvent) => void;
    /** Callback when mouse leaves marker */
    onMouseLeave?: (e: MouseEvent) => void;
    /** Callback when marker drag starts (requires draggable: true) */
    onDragStart?: (lngLat: { lng: number; lat: number }) => void;
    /** Callback during marker drag (requires draggable: true) */
    onDrag?: (lngLat: { lng: number; lat: number }) => void;
    /** Callback when marker drag ends (requires draggable: true) */
    onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

function MapMarker({
    longitude,
    latitude,
    children,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
    draggable = false,
    ...markerOptions
}: MapMarkerProps) {
    const { map, maplibre } = useMap();
    const [marker, setMarker] = useState<MapLibreMarker | null>(null);

    const callbacksRef = useRef({
        onClick,
        onMouseEnter,
        onMouseLeave,
        onDragStart,
        onDrag,
        onDragEnd,
    });
    callbacksRef.current = {
        onClick,
        onMouseEnter,
        onMouseLeave,
        onDragStart,
        onDrag,
        onDragEnd,
    };

    // Construction values, read once. Later changes go through the sync block below.
    const initRef = useRef({ markerOptions, draggable, longitude, latitude });
    initRef.current = { markerOptions, draggable, longitude, latitude };

    // Creation lives in an effect, not a useMemo: React may drop a memo cache at
    // any time, and every dropped Marker here leaked six listeners and an element
    // that stayed on the map. Layout timing keeps the marker's content committed
    // in the same frame it is added, exactly as before.
    useLayoutEffect(() => {
        if (!map || !maplibre) return;

        const init = initRef.current;
        const markerInstance = new maplibre.Marker({
            ...init.markerOptions,
            element: document.createElement("div"),
            draggable: init.draggable,
        }).setLngLat([init.longitude, init.latitude]);

        const element = markerInstance.getElement();

        const handleClick = (e: MouseEvent) => callbacksRef.current.onClick?.(e);
        const handleMouseEnter = (e: MouseEvent) => callbacksRef.current.onMouseEnter?.(e);
        const handleMouseLeave = (e: MouseEvent) => callbacksRef.current.onMouseLeave?.(e);

        element.addEventListener("click", handleClick);
        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);

        const handleDragStart = () => {
            const lngLat = markerInstance.getLngLat();
            callbacksRef.current.onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
        };
        const handleDrag = () => {
            const lngLat = markerInstance.getLngLat();
            callbacksRef.current.onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
        };
        const handleDragEnd = () => {
            const lngLat = markerInstance.getLngLat();
            callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
        };

        markerInstance.on("dragstart", handleDragStart);
        markerInstance.on("drag", handleDrag);
        markerInstance.on("dragend", handleDragEnd);

        markerInstance.addTo(map);
        setMarker(markerInstance);

        return () => {
            element.removeEventListener("click", handleClick);
            element.removeEventListener("mouseenter", handleMouseEnter);
            element.removeEventListener("mouseleave", handleMouseLeave);
            markerInstance.off("dragstart", handleDragStart);
            markerInstance.off("drag", handleDrag);
            markerInstance.off("dragend", handleDragEnd);
            markerInstance.remove();
            setMarker(null);
        };
    }, [map, maplibre]);

    if (marker) {
        if (marker.getLngLat().lng !== longitude || marker.getLngLat().lat !== latitude) {
            marker.setLngLat([longitude, latitude]);
        }
        if (marker.isDraggable() !== draggable) {
            marker.setDraggable(draggable);
        }

        const currentOffset = marker.getOffset();
        // Annotated so the `[0, 0]` fallback is the tuple `setOffset` wants, not `number[]`.
        const newOffset: PointLike = markerOptions.offset ?? [0, 0];
        const [newOffsetX, newOffsetY] = Array.isArray(newOffset) ? newOffset : [newOffset.x, newOffset.y];
        if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) {
            marker.setOffset(newOffset);
        }

        if (marker.getRotation() !== markerOptions.rotation) {
            marker.setRotation(markerOptions.rotation ?? 0);
        }
        if (marker.getRotationAlignment() !== markerOptions.rotationAlignment) {
            marker.setRotationAlignment(markerOptions.rotationAlignment ?? "auto");
        }
        if (marker.getPitchAlignment() !== markerOptions.pitchAlignment) {
            marker.setPitchAlignment(markerOptions.pitchAlignment ?? "auto");
        }
    }

    if (!marker || !map || !maplibre) return null;

    return <MarkerContext.Provider value={{ marker, map, maplibre }}>{children}</MarkerContext.Provider>;
}

type MarkerContentProps = {
    /** Custom marker content. Defaults to a blue dot if not provided */
    children?: ReactNode;
    /** Additional CSS classes for the marker container */
    className?: string;
};

function MarkerContent({ children, className }: MarkerContentProps) {
    const { marker } = useMarkerContext();

    return createPortal(
        <div className={cn("relative cursor-pointer", className)}>{children || <DefaultMarkerIcon />}</div>,
        marker.getElement(),
    );
}

function DefaultMarkerIcon() {
    return <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />;
}

type MarkerPopupProps = {
    /** Popup content */
    children: ReactNode;
    /** Additional CSS classes for the popup container */
    className?: string;
    /** Show a close button in the popup (default: false) */
    closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MarkerPopup({ children, className, closeButton = false, ...popupOptions }: MarkerPopupProps) {
    const { marker, maplibre } = useMarkerContext();
    const [instance, setInstance] = useState<{ popup: MapLibrePopup; container: HTMLDivElement } | null>(null);
    const initOptionsRef = useRef(popupOptions);
    initOptionsRef.current = popupOptions;
    const prevPopupOptions = useRef(popupOptions);

    // The popup and its portal host are created and destroyed with the effect, so
    // a discarded memo cache can no longer strand a Popup bound to the marker.
    useLayoutEffect(() => {
        const container = document.createElement("div");
        const popupInstance = new maplibre.Popup({
            offset: 16,
            ...initOptionsRef.current,
            closeButton: false,
        })
            .setMaxWidth("none")
            .setDOMContent(container);

        marker.setPopup(popupInstance);
        setInstance({ popup: popupInstance, container });

        return () => {
            // setPopup(null) removes the popup and unbinds the marker's key handler.
            marker.setPopup(null);
            setInstance(null);
        };
    }, [marker, maplibre]);

    const popup = instance?.popup ?? null;

    if (popup?.isOpen()) {
        const prev = prevPopupOptions.current;

        if (prev.offset !== popupOptions.offset) {
            popup.setOffset(popupOptions.offset ?? 16);
        }
        if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
            popup.setMaxWidth(popupOptions.maxWidth ?? "none");
        }

        prevPopupOptions.current = popupOptions;
    }

    if (!instance) return null;

    const handleClose = () => instance.popup.remove();

    return createPortal(
        <div
            className={cn(
                "relative animate-in rounded-md border bg-popover p-3 text-popover-foreground shadow-md fade-in-0 zoom-in-95",
                className,
            )}
        >
            {closeButton && (
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute end-1 top-1 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                    aria-label="Close popup"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            )}
            {children}
        </div>,
        instance.container,
    );
}

type MarkerTooltipProps = {
    /** Tooltip content */
    children: ReactNode;
    /** Additional CSS classes for the tooltip container */
    className?: string;
} & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

function MarkerTooltip({ children, className, ...popupOptions }: MarkerTooltipProps) {
    const { marker, map, maplibre } = useMarkerContext();
    const [instance, setInstance] = useState<{ tooltip: MapLibrePopup; container: HTMLDivElement } | null>(null);
    const initOptionsRef = useRef(popupOptions);
    initOptionsRef.current = popupOptions;
    const prevTooltipOptions = useRef(popupOptions);

    // Creation, the hover listeners and teardown all live in one effect so the
    // tooltip cannot outlive the marker element it is attached to.
    useLayoutEffect(() => {
        const container = document.createElement("div");
        const tooltipInstance = new maplibre.Popup({
            offset: 16,
            ...initOptionsRef.current,
            closeOnClick: true,
            closeButton: false,
        }).setMaxWidth("none");

        tooltipInstance.setDOMContent(container);

        const element = marker.getElement();
        const handleMouseEnter = () => {
            tooltipInstance.setLngLat(marker.getLngLat()).addTo(map);
        };
        const handleMouseLeave = () => tooltipInstance.remove();

        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);

        setInstance({ tooltip: tooltipInstance, container });

        return () => {
            element.removeEventListener("mouseenter", handleMouseEnter);
            element.removeEventListener("mouseleave", handleMouseLeave);
            tooltipInstance.remove();
            setInstance(null);
        };
    }, [map, marker, maplibre]);

    const tooltip = instance?.tooltip ?? null;

    if (tooltip?.isOpen()) {
        const prev = prevTooltipOptions.current;

        if (prev.offset !== popupOptions.offset) {
            tooltip.setOffset(popupOptions.offset ?? 16);
        }
        if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
            tooltip.setMaxWidth(popupOptions.maxWidth ?? "none");
        }

        prevTooltipOptions.current = popupOptions;
    }

    if (!instance) return null;

    return createPortal(
        <div
            className={cn(
                "animate-in rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md fade-in-0 zoom-in-95",
                className,
            )}
        >
            {children}
        </div>,
        instance.container,
    );
}

type MarkerLabelProps = {
    /** Label text content */
    children: ReactNode;
    /** Additional CSS classes for the label */
    className?: string;
    /** Position of the label relative to the marker (default: "top") */
    position?: "top" | "bottom";
};

function MarkerLabel({ children, className, position = "top" }: MarkerLabelProps) {
    const labelPositionClasses = {
        top: "bottom-full mb-1",
        bottom: "top-full mt-1",
    };

    return (
        <div
            className={cn(
                "absolute start-1/2 -translate-x-1/2 whitespace-nowrap rtl:translate-x-1/2",
                "text-[10px] font-medium text-foreground",
                labelPositionClasses[position],
                className,
            )}
        >
            {children}
        </div>
    );
}

type MapControlsProps = {
    /** Position of the controls on the map (default: "bottom-right") */
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    /** Show zoom in/out buttons (default: true) */
    showZoom?: boolean;
    /** Show compass button to reset bearing (default: false) */
    showCompass?: boolean;
    /** Show locate button to find user's location (default: false) */
    showLocate?: boolean;
    /** Show fullscreen toggle button (default: false) */
    showFullscreen?: boolean;
    /** Additional CSS classes for the controls container */
    className?: string;
    /** Callback with user coordinates when located */
    onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

const positionClasses = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-10 right-2",
};

function ControlGroup({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-border">
            {children}
        </div>
    );
}

function ControlButton({
    onClick,
    label,
    children,
    disabled = false,
}: {
    onClick: () => void;
    label: string;
    children: ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            type="button"
            className={cn(
                "flex size-8 items-center justify-center transition-colors hover:bg-accent dark:hover:bg-accent/40",
                disabled && "pointer-events-none cursor-not-allowed opacity-50",
            )}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

function MapControls({
    position = "bottom-right",
    showZoom = true,
    showCompass = false,
    showLocate = false,
    showFullscreen = false,
    className,
    onLocate,
}: MapControlsProps) {
    const { map } = useMap();
    const [waitingForLocation, setWaitingForLocation] = useState(false);

    const handleZoomIn = useCallback(() => {
        map?.zoomTo(map.getZoom() + 1, { duration: 300 });
    }, [map]);

    const handleZoomOut = useCallback(() => {
        map?.zoomTo(map.getZoom() - 1, { duration: 300 });
    }, [map]);

    const handleResetBearing = useCallback(() => {
        map?.resetNorthPitch({ duration: 300 });
    }, [map]);

    const handleLocate = useCallback(() => {
        setWaitingForLocation(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = {
                        longitude: pos.coords.longitude,
                        latitude: pos.coords.latitude,
                    };
                    map?.flyTo({
                        center: [coords.longitude, coords.latitude],
                        zoom: 14,
                        duration: 1500,
                    });
                    onLocate?.(coords);
                    setWaitingForLocation(false);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setWaitingForLocation(false);
                },
            );
        }
    }, [map, onLocate]);

    const handleFullscreen = useCallback(() => {
        const container = map?.getContainer();
        if (!container) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    }, [map]);

    return (
        <div className={cn("absolute z-10 flex flex-col gap-1.5", positionClasses[position], className)}>
            {showZoom && (
                <ControlGroup>
                    <ControlButton onClick={handleZoomIn} label="Zoom in">
                        <Plus className="size-4" />
                    </ControlButton>
                    <ControlButton onClick={handleZoomOut} label="Zoom out">
                        <Minus className="size-4" />
                    </ControlButton>
                </ControlGroup>
            )}
            {showCompass && (
                <ControlGroup>
                    <CompassButton onClick={handleResetBearing} />
                </ControlGroup>
            )}
            {showLocate && (
                <ControlGroup>
                    <ControlButton onClick={handleLocate} label="Find my location" disabled={waitingForLocation}>
                        {waitingForLocation ? <Loader2 className="size-4 animate-spin" /> : <Locate className="size-4" />}
                    </ControlButton>
                </ControlGroup>
            )}
            {showFullscreen && (
                <ControlGroup>
                    <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
                        <Maximize className="size-4" />
                    </ControlButton>
                </ControlGroup>
            )}
        </div>
    );
}

function CompassButton({ onClick }: { onClick: () => void }) {
    const { map } = useMap();
    const compassRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!map || !compassRef.current) return;

        const compass = compassRef.current;

        const updateRotation = () => {
            const bearing = map.getBearing();
            const pitch = map.getPitch();
            compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
        };

        map.on("rotate", updateRotation);
        map.on("pitch", updateRotation);
        updateRotation();

        return () => {
            map.off("rotate", updateRotation);
            map.off("pitch", updateRotation);
        };
    }, [map]);

    return (
        <ControlButton onClick={onClick} label="Reset bearing to north">
            <svg
                ref={compassRef}
                viewBox="0 0 24 24"
                className="size-5 transition-transform duration-200"
                style={{ transformStyle: "preserve-3d" }}
            >
                <path d="M12 2L16 12H12V2Z" className="fill-red-500" />
                <path d="M12 2L8 12H12V2Z" className="fill-red-300" />
                <path d="M12 22L16 12H12V22Z" className="fill-muted-foreground/60" />
                <path d="M12 22L8 12H12V22Z" className="fill-muted-foreground/30" />
            </svg>
        </ControlButton>
    );
}

type MapPopupProps = {
    /** Longitude coordinate for popup position */
    longitude: number;
    /** Latitude coordinate for popup position */
    latitude: number;
    /** Callback when popup is closed */
    onClose?: () => void;
    /** Popup content */
    children: ReactNode;
    /** Additional CSS classes for the popup container */
    className?: string;
    /** Show a close button in the popup (default: false) */
    closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MapPopup({
    longitude,
    latitude,
    onClose,
    children,
    className,
    closeButton = false,
    ...popupOptions
}: MapPopupProps) {
    const { map, maplibre } = useMap();
    const [instance, setInstance] = useState<{ popup: MapLibrePopup; container: HTMLDivElement } | null>(null);
    const popupOptionsRef = useRef(popupOptions);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const initRef = useRef({ popupOptions, longitude, latitude });
    initRef.current = { popupOptions, longitude, latitude };

    useLayoutEffect(() => {
        if (!map || !maplibre) return;

        const init = initRef.current;
        const container = document.createElement("div");
        const popupInstance = new maplibre.Popup({
            offset: 16,
            ...init.popupOptions,
            closeButton: false,
        })
            .setMaxWidth("none")
            .setLngLat([init.longitude, init.latitude]);

        const onCloseProp = () => onCloseRef.current?.();

        popupInstance.on("close", onCloseProp);
        popupInstance.setDOMContent(container);
        setInstance({ popup: popupInstance, container });

        return () => {
            popupInstance.off("close", onCloseProp);
            if (popupInstance.isOpen()) {
                popupInstance.remove();
            }
            setInstance(null);
        };
    }, [map, maplibre]);

    // Added only once the portal content has been committed: maplibre picks the
    // popup's anchor from the container's measured size, and an empty container
    // would anchor it against the wrong edge.
    useEffect(() => {
        if (!map || !instance) return;
        instance.popup.addTo(map);
    }, [map, instance]);

    const popup = instance?.popup ?? null;

    if (popup?.isOpen()) {
        const prev = popupOptionsRef.current;

        if (popup.getLngLat().lng !== longitude || popup.getLngLat().lat !== latitude) {
            popup.setLngLat([longitude, latitude]);
        }

        if (prev.offset !== popupOptions.offset) {
            popup.setOffset(popupOptions.offset ?? 16);
        }
        if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
            popup.setMaxWidth(popupOptions.maxWidth ?? "none");
        }
        popupOptionsRef.current = popupOptions;
    }

    if (!instance) return null;

    const handleClose = () => {
        instance.popup.remove();
    };

    return createPortal(
        <div
            className={cn(
                "relative animate-in rounded-md border bg-popover p-3 text-popover-foreground shadow-md fade-in-0 zoom-in-95",
                className,
            )}
        >
            {closeButton && (
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute end-1 top-1 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                    aria-label="Close popup"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            )}
            {children}
        </div>,
        instance.container,
    );
}

type MapRouteProps = {
    /** Optional unique identifier for the route layer */
    id?: string;
    /** Array of [longitude, latitude] coordinate pairs defining the route */
    coordinates: [number, number][];
    /** Line color as CSS color value (default: "#4285F4") */
    color?: string;
    /** Line width in pixels (default: 3) */
    width?: number;
    /** Line opacity from 0 to 1 (default: 0.8) */
    opacity?: number;
    /** Dash pattern [dash length, gap length] for dashed lines */
    dashArray?: [number, number];
    /** Callback when the route line is clicked */
    onClick?: () => void;
    /** Callback when mouse enters the route line */
    onMouseEnter?: () => void;
    /** Callback when mouse leaves the route line */
    onMouseLeave?: () => void;
    /** Whether the route is interactive - shows pointer cursor on hover (default: true) */
    interactive?: boolean;
};

function MapRoute({
    id: propId,
    coordinates,
    color = "#4285F4",
    width = 3,
    opacity = 0.8,
    dashArray,
    onClick,
    onMouseEnter,
    onMouseLeave,
    interactive = true,
}: MapRouteProps) {
    const { map, isLoaded } = useMap();
    const autoId = useId();
    const id = propId ?? autoId;
    const sourceId = `route-source-${id}`;
    const layerId = `route-layer-${id}`;

    // Add source and layer on mount
    useEffect(() => {
        if (!isLoaded || !map) return;

        map.addSource(sourceId, {
            type: "geojson",
            data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: [] },
            },
        });

        map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
                "line-color": color,
                "line-width": width,
                "line-opacity": opacity,
                ...(dashArray && { "line-dasharray": dashArray }),
            },
        });

        return () => {
            try {
                if (map.getLayer(layerId)) map.removeLayer(layerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);
            } catch {
                // ignore
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, map]);

    // When coordinates change, update the source data
    useEffect(() => {
        if (!isLoaded || !map || coordinates.length < 2) return;

        const source = map.getSource<GeoJSONSource>(sourceId);
        if (source) {
            source.setData({
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates },
            });
        }
    }, [isLoaded, map, coordinates, sourceId]);

    useEffect(() => {
        if (!isLoaded || !map || !map.getLayer(layerId)) return;

        map.setPaintProperty(layerId, "line-color", color);
        map.setPaintProperty(layerId, "line-width", width);
        map.setPaintProperty(layerId, "line-opacity", opacity);
        if (dashArray) {
            map.setPaintProperty(layerId, "line-dasharray", dashArray);
        }
    }, [isLoaded, map, layerId, color, width, opacity, dashArray]);

    // Handle click and hover events
    useEffect(() => {
        if (!isLoaded || !map || !interactive) return;

        const handleClick = () => {
            onClick?.();
        };
        const handleMouseEnter = () => {
            map.getCanvas().style.cursor = "pointer";
            onMouseEnter?.();
        };
        const handleMouseLeave = () => {
            map.getCanvas().style.cursor = "";
            onMouseLeave?.();
        };

        map.on("click", layerId, handleClick);
        map.on("mouseenter", layerId, handleMouseEnter);
        map.on("mouseleave", layerId, handleMouseLeave);

        return () => {
            map.off("click", layerId, handleClick);
            map.off("mouseenter", layerId, handleMouseEnter);
            map.off("mouseleave", layerId, handleMouseLeave);
        };
    }, [isLoaded, map, layerId, onClick, onMouseEnter, onMouseLeave, interactive]);

    return null;
}

type MapClusterLayerProps<P extends GeoJsonProperties = GeoJsonProperties> = {
    /** GeoJSON FeatureCollection data or URL to fetch GeoJSON from */
    data: string | FeatureCollection<Point, P>;
    /** Maximum zoom level to cluster points on (default: 14) */
    clusterMaxZoom?: number;
    /** Radius of each cluster when clustering points in pixels (default: 50) */
    clusterRadius?: number;
    /** Colors for cluster circles: [small, medium, large] based on point count (default: ["#22c55e", "#eab308", "#ef4444"]) */
    clusterColors?: [string, string, string];
    /** Point count thresholds for color/size steps: [medium, large] (default: [100, 750]) */
    clusterThresholds?: [number, number];
    /** Color for unclustered individual points (default: "#3b82f6") */
    pointColor?: string;
    /** Callback when an unclustered point is clicked */
    onPointClick?: (feature: Feature<Point, P>, coordinates: [number, number]) => void;
    /** Callback when a cluster is clicked. If not provided, zooms into the cluster */
    onClusterClick?: (clusterId: number, coordinates: [number, number], pointCount: number) => void;
};

function MapClusterLayer<P extends GeoJsonProperties = GeoJsonProperties>({
    data,
    clusterMaxZoom = 14,
    clusterRadius = 50,
    clusterColors = ["#22c55e", "#eab308", "#ef4444"],
    clusterThresholds = [100, 750],
    pointColor = "#3b82f6",
    onPointClick,
    onClusterClick,
}: MapClusterLayerProps<P>) {
    const { map, isLoaded } = useMap();
    const id = useId();
    const sourceId = `cluster-source-${id}`;
    const clusterLayerId = `clusters-${id}`;
    const clusterCountLayerId = `cluster-count-${id}`;
    const unclusteredLayerId = `unclustered-point-${id}`;

    const stylePropsRef = useRef({
        clusterColors,
        clusterThresholds,
        pointColor,
    });

    // Add source and layers on mount
    useEffect(() => {
        if (!isLoaded || !map) return;

        // Add clustered GeoJSON source
        map.addSource(sourceId, {
            type: "geojson",
            data,
            cluster: true,
            clusterMaxZoom,
            clusterRadius,
        });

        // Add cluster circles layer
        map.addLayer({
            id: clusterLayerId,
            type: "circle",
            source: sourceId,
            filter: ["has", "point_count"],
            paint: {
                "circle-color": [
                    "step",
                    ["get", "point_count"],
                    clusterColors[0],
                    clusterThresholds[0],
                    clusterColors[1],
                    clusterThresholds[1],
                    clusterColors[2],
                ],
                "circle-radius": ["step", ["get", "point_count"], 20, clusterThresholds[0], 30, clusterThresholds[1], 40],
                "circle-stroke-width": 1,
                "circle-stroke-color": "#fff",
                "circle-opacity": 0.85,
            },
        });

        // Add cluster count text layer
        map.addLayer({
            id: clusterCountLayerId,
            type: "symbol",
            source: sourceId,
            filter: ["has", "point_count"],
            layout: {
                "text-field": "{point_count_abbreviated}",
                "text-font": ["Open Sans"],
                "text-size": 12,
            },
            paint: {
                "text-color": "#fff",
            },
        });

        // Add unclustered point layer
        map.addLayer({
            id: unclusteredLayerId,
            type: "circle",
            source: sourceId,
            filter: ["!", ["has", "point_count"]],
            paint: {
                "circle-color": pointColor,
                "circle-radius": 5,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
            },
        });

        return () => {
            try {
                if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
                if (map.getLayer(unclusteredLayerId)) map.removeLayer(unclusteredLayerId);
                if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);
            } catch {
                // ignore
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, map, sourceId]);

    // Update source data when data prop changes (only for non-URL data)
    useEffect(() => {
        if (!isLoaded || !map || typeof data === "string") return;

        const source = map.getSource<GeoJSONSource>(sourceId);
        if (source) {
            source.setData(data);
        }
    }, [isLoaded, map, data, sourceId]);

    // Update layer styles when props change
    useEffect(() => {
        if (!isLoaded || !map) return;

        const prev = stylePropsRef.current;
        const colorsChanged = prev.clusterColors !== clusterColors || prev.clusterThresholds !== clusterThresholds;

        // Update cluster layer colors and sizes
        if (map.getLayer(clusterLayerId) && colorsChanged) {
            map.setPaintProperty(clusterLayerId, "circle-color", [
                "step",
                ["get", "point_count"],
                clusterColors[0],
                clusterThresholds[0],
                clusterColors[1],
                clusterThresholds[1],
                clusterColors[2],
            ]);
            map.setPaintProperty(clusterLayerId, "circle-radius", [
                "step",
                ["get", "point_count"],
                20,
                clusterThresholds[0],
                30,
                clusterThresholds[1],
                40,
            ]);
        }

        // Update unclustered point layer color
        if (map.getLayer(unclusteredLayerId) && prev.pointColor !== pointColor) {
            map.setPaintProperty(unclusteredLayerId, "circle-color", pointColor);
        }

        stylePropsRef.current = { clusterColors, clusterThresholds, pointColor };
    }, [isLoaded, map, clusterLayerId, unclusteredLayerId, clusterColors, clusterThresholds, pointColor]);

    // Handle click events
    useEffect(() => {
        if (!isLoaded || !map) return;

        let disposed = false;

        // Cluster click handler - zoom into cluster
        const handleClusterClick = (
            e: MapMouseEvent & {
                features?: MapGeoJSONFeature[];
            },
        ) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [clusterLayerId],
            });
            if (!features.length) return;

            const feature = features[0];
            const clusterId = Number(feature.properties?.cluster_id);
            const pointCount = Number(feature.properties?.point_count);
            const coordinates = (feature.geometry as Point).coordinates as [number, number];

            if (onClusterClick) {
                onClusterClick(clusterId, coordinates, pointCount);
            } else {
                // Default behavior: zoom to cluster expansion zoom
                const source = map.getSource<GeoJSONSource>(sourceId);
                if (!source) return;

                // maplibre-gl 5 answers this from the worker, so it is a promise.
                source
                    .getClusterExpansionZoom(clusterId)
                    .then((zoom) => {
                        if (disposed) return;
                        map.easeTo({
                            center: coordinates,
                            zoom,
                        });
                    })
                    .catch(() => {
                        // The source can be torn down mid-flight; nothing to zoom to.
                    });
            }
        };

        // Unclustered point click handler
        const handlePointClick = (
            e: MapMouseEvent & {
                features?: MapGeoJSONFeature[];
            },
        ) => {
            if (!onPointClick || !e.features?.length) return;

            const feature = e.features[0];
            const coordinates = (feature.geometry as Point).coordinates.slice() as [number, number];

            // Handle world copies
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            onPointClick(feature as unknown as Feature<Point, P>, coordinates);
        };

        // Cursor style handlers
        const handleMouseEnterCluster = () => {
            map.getCanvas().style.cursor = "pointer";
        };
        const handleMouseLeaveCluster = () => {
            map.getCanvas().style.cursor = "";
        };
        const handleMouseEnterPoint = () => {
            if (onPointClick) {
                map.getCanvas().style.cursor = "pointer";
            }
        };
        const handleMouseLeavePoint = () => {
            map.getCanvas().style.cursor = "";
        };

        map.on("click", clusterLayerId, handleClusterClick);
        map.on("click", unclusteredLayerId, handlePointClick);
        map.on("mouseenter", clusterLayerId, handleMouseEnterCluster);
        map.on("mouseleave", clusterLayerId, handleMouseLeaveCluster);
        map.on("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
        map.on("mouseleave", unclusteredLayerId, handleMouseLeavePoint);

        return () => {
            disposed = true;
            map.off("click", clusterLayerId, handleClusterClick);
            map.off("click", unclusteredLayerId, handlePointClick);
            map.off("mouseenter", clusterLayerId, handleMouseEnterCluster);
            map.off("mouseleave", clusterLayerId, handleMouseLeaveCluster);
            map.off("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
            map.off("mouseleave", unclusteredLayerId, handleMouseLeavePoint);
        };
    }, [isLoaded, map, clusterLayerId, unclusteredLayerId, sourceId, onClusterClick, onPointClick]);

    return null;
}

export {
    Map,
    MapClusterLayer,
    MapControls,
    MapMarker,
    MapPopup,
    MapRoute,
    MarkerContent,
    MarkerLabel,
    MarkerPopup,
    MarkerTooltip,
    useMap,
};

export type { MapRef, MapViewport };
