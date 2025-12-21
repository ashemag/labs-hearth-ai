import clsx from "clsx";
import { BeatLoader } from "react-spinners";

const Save = ({ disabled, loading }: { disabled: boolean; loading: boolean }) => (
  <div className="mt-6 flex items-center justify-end gap-x-6">
    <button
      disabled={disabled}
      type="submit"
      className={clsx(
        "rounded-md  w-full px-3 py-4 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2",
        !disabled ? "bg-brand-orange text-white hover:bg-brand-orange/80" : "bg-gray-200 text-gray-500"
      )}
    >
      {!loading ? (
        `Submit`
      ) : (
        <div className="flex flex-row justify-center">
          <BeatLoader size={10} color={"#FFFFFF"} />
        </div>
      )}
    </button>
  </div>
);

export default Save;
