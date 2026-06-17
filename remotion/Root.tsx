import { Composition } from "remotion";
import {
    ModernRolodexVideo,
    ONBOARDING_VIDEO_DURATION,
} from "../src/features/onboarding/ModernRolodexVideo";

export function RemotionRoot() {
    return (
        <Composition
            id="OnboardingTour"
            component={ModernRolodexVideo}
            durationInFrames={ONBOARDING_VIDEO_DURATION}
            fps={30}
            width={1280}
            height={720}
        />
    );
}
