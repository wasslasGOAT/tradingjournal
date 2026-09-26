import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import { haptics } from '../../haptics';
import { useThemeMode } from '../../theme/ThemeProvider';
import { themes } from '../../tokens';
import { Button } from '../Button';
import { Card } from '../Card';
import { Sheet } from '../Sheet';

export interface SelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

export interface SelectProps<T extends string = string> {
  readonly testID?: string;
  readonly options: readonly SelectOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** Libellé du groupe — titre de la sheet (mobile) et description par défaut du déclencheur. */
  readonly label: string;
  /** Libellé accessible du bouton déclencheur — défaut `label`. */
  readonly triggerAccessibilityLabel?: string;
  /** Libellé accessible du bouton de fermeture de la sheet (mobile, ex. `t('common.close')`). */
  readonly closeAccessibilityLabel: string;
}

/** À partir de cette largeur (web), le menu s'ouvre en popover ancré au déclencheur plutôt qu'en sheet. */
const WEB_MENU_BREAKPOINT = 768;

interface SelectOptionRowProps<T extends string> {
  readonly testID?: string;
  readonly option: SelectOption<T>;
  readonly selected: boolean;
  readonly onPress: () => void;
}

/** Ligne d'option, partagée entre le menu web et la sheet mobile. */
function SelectOptionRow<T extends string>({
  testID,
  option,
  selected,
  onPress,
}: SelectOptionRowProps<T>) {
  const mode = useThemeMode();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className="min-h-11 flex-row items-center justify-between gap-sm rounded-sm px-sm py-xs"
    >
      <Text
        className={`flex-1 font-sans text-sm ${selected ? 'text-accent' : 'text-textPrimary'}`}
        numberOfLines={1}
      >
        {option.label}
      </Text>
      {selected ? <Check size={16} color={themes[mode].accent} /> : null}
    </Pressable>
  );
}

/**
 * Liste d'options (M1-4, ARCHITECTURE §6.1/§6.2) : s'ouvre dans une `Sheet`
 * sur mobile (et web étroit), en menu ancré au déclencheur sur web large
 * (`WEB_MENU_BREAKPOINT`) — option sélectionnée marquée (coche), haptique à
 * la sélection. Remplace les listes provisoires du header
 * (`AccountSelector`/`PeriodSelector`, M1-8).
 */
export function Select<T extends string = string>({
  testID,
  options,
  value,
  onChange,
  label,
  triggerAccessibilityLabel,
  closeAccessibilityLabel,
}: SelectProps<T>) {
  const mode = useThemeMode();
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWebMenu = Platform.OS === 'web' && width >= WEB_MENU_BREAKPOINT;
  const selectedOption = options.find((option) => option.value === value);
  const containerRef = useRef<View>(null);

  const handleSelect = (nextValue: T) => {
    setOpen(false);
    if (nextValue !== value) onChange(nextValue);
  };

  // Web large uniquement : ferme au clic hors du menu (pas de calque plein écran nécessaire,
  // contrairement à `Sheet` — un seul écouteur global, comparé au conteneur du composant).
  useEffect(() => {
    if (!isWebMenu || !open || Platform.OS !== 'web') return;
    const handlePointerDown = (event: MouseEvent) => {
      const node = containerRef.current as unknown as HTMLElement | null;
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWebMenu, open]);

  return (
    <View testID={testID} ref={containerRef} className={isWebMenu ? 'relative' : undefined}>
      <Button
        testID={testID ? `${testID}-trigger` : undefined}
        label={selectedOption?.label ?? ''}
        variant="secondary"
        size="sm"
        icon={<ChevronDown size={14} color={themes[mode].textPrimary} />}
        accessibilityLabel={triggerAccessibilityLabel ?? label}
        onPress={() => setOpen((current) => !current)}
      />
      {isWebMenu ? (
        open ? (
          <Card
            testID={testID ? `${testID}-menu` : undefined}
            className="absolute top-12 left-0 z-50 min-w-48 gap-xs p-xs"
          >
            {options.map((option) => (
              <SelectOptionRow
                key={option.value}
                testID={testID ? `${testID}-option-${option.value}` : undefined}
                option={option}
                selected={option.value === value}
                onPress={() => handleSelect(option.value)}
              />
            ))}
          </Card>
        ) : null
      ) : (
        <Sheet
          testID={testID ? `${testID}-sheet` : undefined}
          visible={open}
          onClose={() => setOpen(false)}
          title={label}
          accessibilityLabel={label}
          closeAccessibilityLabel={closeAccessibilityLabel}
        >
          <View className="gap-xs">
            {options.map((option) => (
              <SelectOptionRow
                key={option.value}
                testID={testID ? `${testID}-option-${option.value}` : undefined}
                option={option}
                selected={option.value === value}
                onPress={() => handleSelect(option.value)}
              />
            ))}
          </View>
        </Sheet>
      )}
    </View>
  );
}
