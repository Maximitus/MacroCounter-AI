import {BodyWeightField} from './BodyWeightField.tsx';
import {GenderField} from './GenderField.tsx';
import {HeightField} from './HeightField.tsx';
import {ProfileNameField} from './ProfileNameField.tsx';

export function ProfileSettingsPanel() {
  return (
    <div className="space-y-4">
      <ProfileNameField />
      <GenderField />
      <HeightField />
      <BodyWeightField />
    </div>
  );
}
