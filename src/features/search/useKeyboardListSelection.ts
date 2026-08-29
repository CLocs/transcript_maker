import { useCallback, useEffect, useState, type KeyboardEvent } from "react";

export function useKeyboardListSelection(
  itemCount: number,
  onSelectIndex: (index: number) => void,
  resetKey: unknown,
) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
  }, [itemCount, resetKey]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (itemCount === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => {
          if (current < 0) return 0;
          return current < itemCount - 1 ? current + 1 : 0;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => {
          if (current < 0) return itemCount - 1;
          return current > 0 ? current - 1 : itemCount - 1;
        });
        return;
      }

      if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        onSelectIndex(activeIndex);
      }
    },
    [activeIndex, itemCount, onSelectIndex],
  );

  return { activeIndex, handleKeyDown };
}
