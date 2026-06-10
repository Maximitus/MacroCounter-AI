import {BodyTypeField} from './BodyTypeField.tsx';
import {BodyWeightField} from './BodyWeightField.tsx';
import {GenderField} from './GenderField.tsx';
import {HeightField} from './HeightField.tsx';
import {ProfileNameField} from './ProfileNameField.tsx';

export function ProfileSettingsPanel() {
  return (
    <div className="space-y-4">
      <ProfileNameField />
      <GenderField />
      <div className="flex flex-wrap gap-4">
        <div className="min-w-0 flex-1 basis-[8rem]">
          <HeightField />
        </div>
        <div className="min-w-0 flex-1 basis-[8rem]">
          <BodyWeightField />
        </div>
      </div>
      <BodyTypeField />
    </div>
  );
}
