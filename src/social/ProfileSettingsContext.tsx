import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import {
  bodyWeightFromLb,
  bodyWeightToLb,
  feetInchesToHeightCm,
  heightCmToFeetInches,
  resolveProfileHeightUnit,
  resolveProfileWeightUnit,
} from './profileBody.ts';
import type {ProfileBodyType, ProfileGender, ProfileHeightUnit, ProfileWeightUnit, UserProfile} from './socialTypes.ts';
import {useSocial} from './SocialContext.tsx';

type ProfileSettingsContextValue = {
  displayName: string;
  setDisplayName: (value: string) => void;
  gender: ProfileGender | undefined;
  setGender: (value: ProfileGender) => void;
  bodyType: ProfileBodyType | undefined;
  setBodyType: (value: ProfileBodyType) => void;
  weightDraft: string;
  setWeightDraft: (value: string) => void;
  weightUnit: ProfileWeightUnit;
  setWeightUnit: (unit: ProfileWeightUnit) => void;
  feet: string;
  setFeet: (value: string) => void;
  inches: string;
  setInches: (value: string) => void;
  cmDraft: string;
  setCmDraft: (value: string) => void;
  heightUnit: ProfileHeightUnit;
  setHeightUnit: (unit: ProfileHeightUnit) => void;
  isDirty: boolean;
  saving: boolean;
  save: () => Promise<void>;
};

const ProfileSettingsContext = createContext<ProfileSettingsContextValue | null>(null);

function formatWeightDraft(lb: number, unit: ProfileWeightUnit): string {
  const display = bodyWeightFromLb(lb, unit);
  return Number.isInteger(display) ? String(display) : display.toFixed(1);
}

function resetDraftFromProfile(profile: UserProfile, setters: {
  setDisplayName: (v: string) => void;
  setGender: (v: ProfileGender | undefined) => void;
  setBodyType: (v: ProfileBodyType | undefined) => void;
  setWeightDraft: (v: string) => void;
  setWeightUnit: (v: ProfileWeightUnit) => void;
  setFeet: (v: string) => void;
  setInches: (v: string) => void;
  setCmDraft: (v: string) => void;
  setHeightUnit: (v: ProfileHeightUnit) => void;
}) {
  const weightUnit = resolveProfileWeightUnit(profile.weightUnit);
  const heightUnit = resolveProfileHeightUnit(profile.heightUnit);

  setters.setDisplayName(profile.displayName ?? '');
  setters.setGender(profile.gender);
  setters.setBodyType(profile.bodyType);
  setters.setWeightUnit(weightUnit);

  const lb = profile.bodyWeightLb;
  if (lb != null && lb > 0) {
    setters.setWeightDraft(formatWeightDraft(lb, weightUnit));
  } else {
    setters.setWeightDraft('');
  }

  setters.setHeightUnit(heightUnit);
  const cm = profile.heightCm;
  if (cm != null && cm > 0) {
    const parts = heightCmToFeetInches(cm);
    setters.setFeet(String(parts.feet));
    setters.setInches(String(parts.inches));
    setters.setCmDraft(String(Math.round(cm)));
  } else {
    setters.setFeet('');
    setters.setInches('');
    setters.setCmDraft('');
  }
}

function parseDraftWeightLb(draft: string, unit: ProfileWeightUnit): number | null {
  const parsed = parseFloat(draft.replace(/,/g, '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return bodyWeightToLb(parsed, unit);
}

function parseDraftHeightCm(
  heightUnit: ProfileHeightUnit,
  feet: string,
  inches: string,
  cmDraft: string,
): number | null {
  if (heightUnit === 'cm') {
    const cm = parseFloat(cmDraft.replace(/,/g, '.'));
    if (!Number.isFinite(cm) || cm <= 0) return null;
    return Math.round(cm * 10) / 10;
  }
  const ft = parseInt(feet, 10);
  const inch = parseInt(inches, 10);
  if (!Number.isFinite(ft) || !Number.isFinite(inch) || ft < 0 || inch < 0 || inch > 11) return null;
  if (ft === 0 && inch === 0) return null;
  return feetInchesToHeightCm(ft, inch);
}

function savedWeightLb(profile: UserProfile | null | undefined): number | null {
  const lb = profile?.bodyWeightLb;
  return lb != null && lb > 0 ? lb : null;
}

function savedHeightCm(profile: UserProfile | null | undefined): number | null {
  const cm = profile?.heightCm;
  return cm != null && cm > 0 ? cm : null;
}

export function ProfileSettingsProvider({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const {
    profile,
    saveDisplayName,
    saveGender,
    saveBodyType,
    saveBodyWeightLb,
    saveHeightCm,
    saveWeightUnit,
    saveHeightUnit,
  } = useSocial();

  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<ProfileGender | undefined>();
  const [bodyType, setBodyType] = useState<ProfileBodyType | undefined>();
  const [weightDraft, setWeightDraft] = useState('');
  const [weightUnit, setWeightUnitState] = useState<ProfileWeightUnit>('lb');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [cmDraft, setCmDraft] = useState('');
  const [heightUnit, setHeightUnitState] = useState<ProfileHeightUnit>('ft_in');
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (!profile || initializedRef.current) return;
    resetDraftFromProfile(profile, {
      setDisplayName,
      setGender,
      setBodyType,
      setWeightDraft,
      setWeightUnit: setWeightUnitState,
      setFeet,
      setInches,
      setCmDraft,
      setHeightUnit: setHeightUnitState,
    });
    initializedRef.current = true;
  }, [open, profile]);

  const setWeightUnit = useCallback(
    (unit: ProfileWeightUnit) => {
      if (unit === weightUnit) return;
      const parsed = parseFloat(weightDraft.replace(/,/g, '.'));
      if (Number.isFinite(parsed) && parsed > 0) {
        const lb = bodyWeightToLb(parsed, weightUnit);
        setWeightDraft(formatWeightDraft(lb, unit));
      }
      setWeightUnitState(unit);
    },
    [weightDraft, weightUnit],
  );

  const setHeightUnit = useCallback(
    (unit: ProfileHeightUnit) => {
      if (unit === heightUnit) return;
      if (unit === 'cm') {
        const ft = parseInt(feet, 10);
        const inch = parseInt(inches, 10);
        if (Number.isFinite(ft) && Number.isFinite(inch) && (ft > 0 || inch > 0)) {
          const cm = feetInchesToHeightCm(ft, inch);
          setCmDraft(String(Math.round(cm)));
        }
      } else {
        const cm = parseFloat(cmDraft.replace(/,/g, '.'));
        if (Number.isFinite(cm) && cm > 0) {
          const parts = heightCmToFeetInches(cm);
          setFeet(String(parts.feet));
          setInches(String(parts.inches));
        }
      }
      setHeightUnitState(unit);
    },
    [cmDraft, feet, heightUnit, inches],
  );

  const isDirty = useMemo(() => {
    if (!profile) return false;

    const trimmedName = displayName.trim();
    if (trimmedName !== (profile.displayName ?? '')) return true;
    if (gender !== profile.gender) return true;
    if (bodyType !== profile.bodyType) return true;

    const savedWUnit = resolveProfileWeightUnit(profile.weightUnit);
    if (weightUnit !== savedWUnit) return true;
    const draftLb = parseDraftWeightLb(weightDraft, weightUnit);
    const profileLb = savedWeightLb(profile);
    if (draftLb !== profileLb) return true;

    const savedHUnit = resolveProfileHeightUnit(profile.heightUnit);
    if (heightUnit !== savedHUnit) return true;
    const draftCm = parseDraftHeightCm(heightUnit, feet, inches, cmDraft);
    const profileCm = savedHeightCm(profile);
    if (draftCm !== profileCm) return true;

    return false;
  }, [bodyType, cmDraft, displayName, feet, gender, heightUnit, inches, profile, weightDraft, weightUnit]);

  const save = useCallback(async () => {
    if (!profile || !isDirty) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Enter a profile name');
      return;
    }

    const savedWUnit = resolveProfileWeightUnit(profile.weightUnit);
    const savedHUnit = resolveProfileHeightUnit(profile.heightUnit);
    const draftLb = parseDraftWeightLb(weightDraft, weightUnit);
    const profileLb = savedWeightLb(profile);
    const draftCm = parseDraftHeightCm(heightUnit, feet, inches, cmDraft);
    const profileCm = savedHeightCm(profile);

    const nameChanged = trimmedName !== (profile.displayName ?? '');
    const genderChanged = gender !== profile.gender;
    const bodyTypeChanged = bodyType !== profile.bodyType;
    const weightUnitChanged = weightUnit !== savedWUnit;
    const weightChanged = draftLb !== profileLb;
    const heightUnitChanged = heightUnit !== savedHUnit;
    const heightChanged = draftCm !== profileCm;

    if (weightChanged && draftLb == null) {
      toast.error('Enter a weight greater than zero');
      return;
    }
    if (heightChanged && draftCm == null) {
      toast.error('Enter a valid height');
      return;
    }
    if (genderChanged && !gender) {
      toast.error('Select a gender');
      return;
    }

    setSaving(true);
    try {
      const tasks: Promise<void>[] = [];
      if (nameChanged) tasks.push(saveDisplayName(trimmedName));
      if (genderChanged && gender) tasks.push(saveGender(gender));
      if (bodyTypeChanged && bodyType) tasks.push(saveBodyType(bodyType));
      if (weightUnitChanged) tasks.push(saveWeightUnit(weightUnit));
      if (weightChanged && draftLb != null) tasks.push(saveBodyWeightLb(draftLb));
      if (heightUnitChanged) tasks.push(saveHeightUnit(heightUnit));
      if (heightChanged && draftCm != null) tasks.push(saveHeightCm(draftCm));
      await Promise.all(tasks);
      toast.success('Profile saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }, [
    bodyType,
    displayName,
    feet,
    gender,
    heightUnit,
    inches,
    cmDraft,
    isDirty,
    profile,
    saveBodyType,
    saveBodyWeightLb,
    saveDisplayName,
    saveGender,
    saveHeightCm,
    saveHeightUnit,
    saveWeightUnit,
    weightDraft,
    weightUnit,
  ]);

  const value = useMemo(
    () => ({
      displayName,
      setDisplayName,
      gender,
      setGender,
      bodyType,
      setBodyType,
      weightDraft,
      setWeightDraft,
      weightUnit,
      setWeightUnit,
      feet,
      setFeet,
      inches,
      setInches,
      cmDraft,
      setCmDraft,
      heightUnit,
      setHeightUnit,
      isDirty,
      saving,
      save,
    }),
    [
      bodyType,
      cmDraft,
      displayName,
      feet,
      gender,
      heightUnit,
      inches,
      isDirty,
      save,
      saving,
      setHeightUnit,
      setWeightUnit,
      weightDraft,
      weightUnit,
    ],
  );

  return (
    <ProfileSettingsContext.Provider value={value}>{children}</ProfileSettingsContext.Provider>
  );
}

export function useProfileSettings(): ProfileSettingsContextValue {
  const ctx = useContext(ProfileSettingsContext);
  if (!ctx) {
    throw new Error('useProfileSettings must be used within ProfileSettingsProvider');
  }
  return ctx;
}

export function useProfileSettingsOptional(): ProfileSettingsContextValue | null {
  return useContext(ProfileSettingsContext);
}
