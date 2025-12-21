import clsx from "clsx";
import { BeatLoader } from "react-spinners";

const SubmitButton = ({ loading, disabled }: { loading: boolean; disabled: boolean }) => (
  <button
    type="submit"
    className={clsx(
      "text-brand-orange text-[15px] font-semibold py-2 px-4 rounded h-10 w-full",
      disabled
        ? "bg-gray-100 text-gray-500 outline-none cursor-not-allowed"
        : "outline outline-brand-orange hover:bg-brand-orange hover:text-white",
      loading && "hover:bg-white cursor-auto"
    )}
    disabled={disabled}
  >
    {!loading ? (
      `Submit`
    ) : (
      <div className="flex flex-row justify-center">
        <BeatLoader size={8} color={"#A7715F"} />
      </div>
    )}
  </button>
);

export default SubmitButton;
