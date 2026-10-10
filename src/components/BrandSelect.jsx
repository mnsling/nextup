import "../styles/brand-inputs.css";
import {
  Children,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown } from "lucide-react";

export function BrandSelect({
  name,
  options: suppliedOptions,
  children,
  placeholder = "Select an option",
  label,
  "aria-label": ariaLabel,
  value: controlled,
  defaultValue,
  onChange,
  disabled,
  required,
  className = "",
}) {
  function flatten(nodes) {
    return Children.toArray(nodes).flatMap((node) => {
      if (node?.props?.children && node.type !== "option") {
        return flatten(node.props.children);
      }

      if (node.type === "option") {
        return [
          {
            value: String(
              node.props.value ?? node.props.children
            ),
            label: node.props.children,
            disabled: node.props.disabled,
          },
        ];
      }

      return [];
    });
  }

  const options = suppliedOptions || flatten(children);

  const [internal, setInternal] = useState(
    defaultValue ??
      (suppliedOptions
        ? ""
        : options.find((item) => !item.disabled)?.value ?? "")
  );

  const value = controlled ?? internal;
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();

  const accessibleLabel =
    label || ariaLabel || name || "Choose an option";

  const selected = options.find(
    (option) => option.value === value
  );

  useEffect(() => {
    const form = root.current?.closest("form");

    function reset() {
      setInternal(
        defaultValue ??
          (suppliedOptions
            ? ""
            : options.find((item) => !item.disabled)?.value ??
              "")
      );
      setInvalid(false);
      setOpen(false);
    }

    form?.addEventListener("reset", reset);

    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue, children, suppliedOptions]);

  useEffect(() => {
    function closeOutside(event) {
      if (!root.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOutside);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOutside
      );
    };
  }, []);

  useEffect(() => {
    if (open) {
      menu.current?.focus();
      menu.current?.children[active]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open, active]);

  function choose(index) {
    if (!options[index] || options[index].disabled) return;

    const next = options[index].value;

    setInternal(next);
    setInvalid(false);
    onChange?.({ target: { name, value: next } });
    setOpen(false);
    trigger.current?.focus();
  }

  function openMenu() {
    setActive(
      Math.max(
        0,
        options.findIndex(
          (option) => option.value === value
        )
      )
    );
    setOpen(true);
  }

  function handleKeys(event) {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (
      ![
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
        "Enter",
        " ",
        "Escape",
      ].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();

    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      choose(active);
    } else if (event.key === "Home") {
      setActive(0);
    } else if (event.key === "End") {
      setActive(options.length - 1);
    } else {
      setActive((index) =>
        Math.max(
          0,
          Math.min(
            options.length - 1,
            index + (event.key === "ArrowDown" ? 1 : -1)
          )
        )
      );
    }
  }

  return (
    <div
      ref={root}
      className={`relative min-w-0 ${className}`}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setOpen(false);
        }
      }}
    >
      <select
        className="sr-only"
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-label={accessibleLabel}
        onChange={(event) => {
          setInternal(event.target.value);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          openMenu();
        }}
      >
        <option value="" />

        {options
          .filter((option) => option.value !== "")
          .map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
      </select>

      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-invalid={invalid}
        aria-label={accessibleLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={(event) => {
          if (
            event.key === "ArrowDown" ||
            event.key === "ArrowUp"
          ) {
            event.preventDefault();
            openMenu();
          }
        }}
        className="
          flex min-h-12 w-full items-center
          justify-between gap-3 rounded-xl
          border border-[#d4dfcc] bg-white
          px-4 py-3 text-left text-sm
          font-semibold text-[#24412b]
          transition hover:border-[#78944b]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#9bbc53]
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        <span className="truncate">
          {selected?.label || placeholder}
        </span>

        <ChevronDown
          size={18}
          className={`shrink-0 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={menu}
          id={id}
          role="listbox"
          aria-label={accessibleLabel}
          aria-activedescendant={`${id}-${active}`}
          tabIndex={-1}
          onKeyDown={handleKeys}
          className="
            absolute left-0 right-0 top-full
            z-50 mt-2 max-h-60 overflow-y-auto
            overscroll-contain rounded-2xl
            border border-[#d4dfcc]
            bg-[#f8faf3] p-2 shadow-xl
            outline-none
            [scrollbar-color:#9bbc53_#edf2e5]
            [scrollbar-width:thin]
          "
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={value === option.value}
              aria-disabled={option.disabled || undefined}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={`
                flex cursor-pointer items-center
                justify-between gap-2 rounded-lg
                px-3 py-3 text-sm transition
                ${
                  value === option.value
                    ? "bg-[#dcfa53] font-bold text-[#24412b]"
                    : active === index
                      ? "bg-[#e7eedb] text-[#24412b]"
                      : "text-[#52634c]"
                }
                ${option.disabled ? "opacity-40" : ""}
              `}
            >
              <span>{option.label}</span>

              {value === option.value && (
                <Check size={16} className="shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}