import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import "./salesDropdown.css";

function optionText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(optionText).join("");
  if (isValidElement(value)) return optionText(value.props.children);
  return "";
}

function buildOptions(children, options) {
  if (options) {
    return options.map((option, index) => ({
      ...option,
      key: option.key ?? `${option.value}-${index}`,
      value: String(option.value ?? ""),
      searchText: option.searchText ?? optionText(option.label),
      isFilterReset: Boolean(option.isFilterReset),
    }));
  }

  return Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === "option")
    .map((child, index) => {
      const label = child.props.children;
      const value = String(child.props.value ?? optionText(label));
      return {
        key: child.key ?? `${value}-${index}`,
        value,
        label,
        searchText: optionText(label),
        disabled: child.props.disabled,
        isFilterReset: child.props["data-filter-reset"] === "true",
      };
    });
}

export default function SalesDropdown({
  children,
  options,
  value,
  onChange,
  disabled = false,
  className = "",
  wrapperClassName = "",
  menuClassName = "",
  searchable = false,
  placeholder,
  hideSelectedResetOption = false,
  required = false,
  id,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  title,
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const listboxId = `${controlId}-options`;
  const allOptions = useMemo(() => buildOptions(children, options), [children, options]);
  const selected = allOptions.find((option) => option.value === String(value ?? ""));
  const menuOptions = useMemo(
    () => hideSelectedResetOption
      ? allOptions.filter((option) => !(option.isFilterReset && option.value === String(value ?? "")))
      : allOptions,
    [allOptions, hideSelectedResetOption, value],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const optionRefs = useRef([]);
  const typeaheadRef = useRef("");
  const typeaheadTimerRef = useRef(null);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? menuOptions.filter((option) => option.searchText.toLocaleLowerCase().includes(normalizedQuery))
      : menuOptions;
  }, [menuOptions, query]);
  const activeOption = visibleOptions[activeIndex];

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const rect = trigger?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 8;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const font = window.getComputedStyle(trigger).font;
      if (context) context.font = font;
      const contentWidth = Math.max(
        rect.width,
        ...visibleOptions.map((option) => (context?.measureText(option.searchText).width || option.searchText.length * 8) + 46),
      );
      const width = Math.min(Math.max(rect.width, contentWidth), window.innerWidth - viewportPadding * 2, 440);
      const estimatedHeight = Math.min(visibleOptions.length * 40 + (searchable ? 56 : 12), 360);
      const below = Math.max(0, window.innerHeight - rect.bottom - viewportPadding);
      const above = Math.max(0, rect.top - viewportPadding);
      const openUpward = below < estimatedHeight && above > below;
      const availableHeight = openUpward ? above : below;
      const maxHeight = Math.max(96, Math.min(360, availableHeight));
      const menuHeight = Math.min(estimatedHeight, maxHeight);
      const top = openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4;
      const left = Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding));

      setPosition({
        top: Math.max(viewportPadding, Math.min(top, window.innerHeight - menuHeight - viewportPadding)),
        left,
        width,
        maxHeight,
        fontFamily: window.getComputedStyle(trigger).fontFamily,
        fontSize: window.getComputedStyle(trigger).fontSize,
      });
    };
    const closeOnOutsideInteraction = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnFocusOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("focusin", closeOnFocusOutside);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("focusin", closeOnFocusOutside);
    };
  }, [open, visibleOptions, searchable]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const selectedIndex = visibleOptions.findIndex((option) => option.value === String(value ?? ""));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : visibleOptions.findIndex((option) => !option.disabled));
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
  }, [open, value, searchable]);

  useEffect(() => {
    if (!open || !activeOption) return;
    const option = optionRefs.current[activeIndex];
    const menuElement = menuRef.current;
    if (!option || !menuElement) return;
    const optionRect = option.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();
    const visibleTop = menuRect.top + (searchable ? searchRef.current?.parentElement?.offsetHeight || 0 : 0);
    if (optionRect.top < visibleTop) menuElement.scrollTop -= visibleTop - optionRect.top;
    else if (optionRect.bottom > menuRect.bottom) menuElement.scrollTop += optionRect.bottom - menuRect.bottom;
  }, [open, activeIndex, activeOption]);

  useEffect(() => () => {
    if (typeaheadTimerRef.current) window.clearTimeout(typeaheadTimerRef.current);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  const selectOption = (option) => {
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value } });
    closeMenu();
  };

  const moveActive = (direction) => {
    if (!visibleOptions.length) return;
    let next = activeIndex;
    do {
      next = (next + direction + visibleOptions.length) % visibleOptions.length;
    } while (visibleOptions[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  };

  const handleKeyDown = (event) => {
    const fromSearch = event.target === searchRef.current;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      }
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(visibleOptions.findIndex((option) => !option.disabled));
    } else if (event.key === "End" && open) {
      event.preventDefault();
      let lastEnabledIndex = visibleOptions.length - 1;
      while (lastEnabledIndex >= 0 && visibleOptions[lastEnabledIndex].disabled) lastEnabledIndex -= 1;
      setActiveIndex(lastEnabledIndex);
    } else if ((event.key === "Enter" || (!fromSearch && event.key === " ")) && open) {
      event.preventDefault();
      selectOption(activeOption);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    } else if (!open && event.key.length === 1 && event.key !== " ") {
      typeaheadRef.current += event.key.toLocaleLowerCase();
      if (typeaheadTimerRef.current) window.clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = window.setTimeout(() => { typeaheadRef.current = ""; }, 600);
      const start = menuOptions.findIndex((option) => option.value === String(value ?? ""));
      const orderedOptions = [...menuOptions.slice(start + 1), ...menuOptions.slice(0, start + 1)];
      const match = orderedOptions.find((option) => !option.disabled && option.searchText.toLocaleLowerCase().startsWith(typeaheadRef.current));
      if (match) {
        onChange?.({ target: { value: match.value } });
      }
    }
  };

  const menu = open && position && typeof document !== "undefined" ? createPortal(
    <div
      ref={menuRef}
      className={`sales-dropdown-menu${menuClassName ? ` ${menuClassName}` : ""}`}
      style={{ ...position, position: "fixed" }}
    >
      {searchable && <label className="sales-dropdown-search">
        <Search size={15} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          role="combobox"
          aria-label={`Search ${ariaLabel || "options"}`}
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-activedescendant={activeOption ? `${controlId}-option-${activeIndex}` : undefined}
          placeholder={`Search ${ariaLabel || "options"}...`}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
        />
      </label>}
      <div id={listboxId} role="listbox" aria-label={ariaLabel ? `${ariaLabel} options` : "Options"}>
        {visibleOptions.length ? visibleOptions.map((option, index) => {
          const OptionIcon = option.icon;
          return <div
            key={option.key}
            ref={(element) => { optionRefs.current[index] = element; }}
            id={`${controlId}-option-${index}`}
            className={`sales-dropdown-option${option.className ? ` ${option.className}` : ""}`}
            role="option"
            aria-selected={selected?.value === option.value}
            aria-disabled={Boolean(option.disabled)}
            data-active={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => selectOption(option)}
          >
            {OptionIcon && <OptionIcon size={15} aria-hidden="true" />}
            <span>{option.label}</span>
          </div>;
        }) : <div className="sales-dropdown-empty" role="status">No options found</div>}
      </div>
    </div>,
    document.body,
  ) : null;

  return <>
    <div className={`sales-dropdown${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        role={searchable ? undefined : "combobox"}
        className={`sales-dropdown-trigger${className ? ` ${className}` : ""}`}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={required || ariaRequired || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={!searchable && open && activeOption ? `${controlId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        title={title}
        style={style}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        {selected?.icon && <selected.icon size={14} aria-hidden="true" />}
        <span className="sales-dropdown-value">{selected?.label ?? placeholder ?? ""}</span>
        <ChevronDown className="sales-dropdown-chevron" size={15} aria-hidden="true" />
      </button>
    </div>
    {menu}
  </>;
}
