import { useRef, useEffect } from "react";
import { X, Loader2, Plus } from "lucide-react";

interface AddContactModalProps {
    addMode: "social" | "name";
    setAddMode: (mode: "social" | "name") => void;
    addHandle: string;
    setAddHandle: (value: string) => void;
    addName: string;
    setAddName: (value: string) => void;
    addLoading: boolean;
    addError: string | null;
    setAddError: (error: string | null) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

export default function AddContactModal({
    addMode,
    setAddMode,
    addHandle,
    setAddHandle,
    addName,
    setAddName,
    addLoading,
    addError,
    setAddError,
    onSubmit,
    onClose,
}: AddContactModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (addMode === "social") {
            inputRef.current?.focus();
        }
    }, [addMode]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Add Contact
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                    <button
                        type="button"
                        onClick={() => { setAddMode("social"); setAddError(null); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${addMode === "social"
                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                    >
                        Import from Social
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAddMode("name"); setAddError(null); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${addMode === "name"
                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                    >
                        Add by Name
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    {addMode === "social" ? (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                X Handle, X URL, or LinkedIn URL
                            </label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={addHandle}
                                onChange={(e) => setAddHandle(e.target.value)}
                                placeholder="@username, x.com/..., or linkedin.com/in/..."
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                            />
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Imports profile photo and bio automatically
                            </p>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Contact Name
                            </label>
                            <input
                                type="text"
                                value={addName}
                                onChange={(e) => setAddName(e.target.value)}
                                placeholder="John Doe"
                                autoFocus
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                            />
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Add a contact without a social profile. You can link one later.
                            </p>
                        </div>
                    )}

                    {addError && (
                        <p className="text-sm text-red-500 mb-4">{addError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={addLoading || (addMode === "social" ? !addHandle.trim() : !addName.trim())}
                        className="w-full py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {addLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {addMode === "social" ? "Loading profile..." : "Creating..."}
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                Add Contact
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
