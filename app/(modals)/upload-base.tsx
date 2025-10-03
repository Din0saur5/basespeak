import { useRouter } from 'expo-router';
import { AvatarForm, AvatarFormSubmit } from '~/components/AvatarForm';
import { uploadBase } from '~/lib/api';
import { useBasespeakStore } from '~/hooks/useBasespeakStore';
import { useAuth } from '~/hooks/useAuth';

export default function UploadBaseModal() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    actions: { addAvatar },
  } = useBasespeakStore();

  const handleSubmit = async (values: AvatarFormSubmit) => {
    if (!user?.id) {
      throw new Error('Not signed in. Please try again.');
    }

    const { baseAsset, idleAsset, talkingAsset, persona, ...rest } = values;
    if (!baseAsset) {
      throw new Error('Base asset missing');
    }

    const response = await uploadBase(
      {
        uri: baseAsset.uri,
        fileName: baseAsset.fileName,
        mimeType: baseAsset.mimeType,
        name: rest.name,
        voicePreset: rest.voicePreset,
        persona: persona || undefined,
        lipsyncQuality: rest.lipsyncQuality,
        idle: idleAsset
          ? {
              uri: idleAsset.uri,
              fileName: idleAsset.fileName,
              mimeType: idleAsset.mimeType,
            }
          : null,
        talking: talkingAsset
          ? {
              uri: talkingAsset.uri,
              fileName: talkingAsset.fileName,
              mimeType: talkingAsset.mimeType,
            }
          : null,
      },
      user.id,
    );

    addAvatar(response.avatar);
    router.back();
  };

  return <AvatarForm mode="create" onSubmit={handleSubmit} />;
}
