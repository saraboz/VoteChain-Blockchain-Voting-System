import { useEffect, useState } from 'react';
import {
    AlertCircle,
    CheckCircle,
    Info,
    AlertTriangle
} from 'lucide-react';
import { createRoot } from 'react-dom/client'; // Fixed: Changed from require to import

// ModalAlert component that blocks the UI until dismissed
export default function ModalAlert({
    type = 'info',
    message,
    title,
    isOpen = true,
    buttonText = 'OK',
    onClose = () => { },  // Default to no-op function
}) {
    // State to control the modal's open/closed state
    const [isModalOpen, setIsModalOpen] = useState(isOpen);

    // Prevent body scrolling when modal is open
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';

            // Focus trap - handle Escape key to close modal
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                }
            };

            document.addEventListener('keydown', handleEscKey);

            return () => {
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleEscKey);
            };
        }
    }, [isModalOpen]);

    // Function to close the modal
    const closeModal = () => {
        setIsModalOpen(false);  // Close the modal by updating local state
        onClose();               // Also call the passed in onClose prop
    };

    // Return null if alert is not visible
    if (!isModalOpen) return null;

    // Styles based on alert type
    const styles = {
        success: {
            bg: "bg-green-50",
            border: "border-green-400",
            icon: <CheckCircle className="w-10 h-10 text-green-500" />,
            title: "text-green-800",
            message: "text-green-700",
            button: "bg-green-500 hover:bg-green-600 focus:ring-green-500"
        },
        error: {
            bg: "bg-red-50",
            border: "border-red-400",
            icon: <AlertCircle className="w-10 h-10 text-red-500" />,
            title: "text-red-800",
            message: "text-red-700",
            button: "bg-red-500 hover:bg-red-600 focus:ring-red-500"
        },
        warning: {
            bg: "bg-yellow-50",
            border: "border-yellow-400",
            icon: <AlertTriangle className="w-10 h-10 text-yellow-500" />,
            title: "text-yellow-800",
            message: "text-yellow-700",
            button: "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500"
        },
        info: {
            bg: "bg-blue-50",
            border: "border-blue-400",
            icon: <Info className="w-10 h-10 text-blue-500" />,
            title: "text-blue-800",
            message: "text-blue-700",
            button: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
        }
    };

    const currentStyle = styles[type] || styles.info;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop overlay */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                aria-hidden="true"
            />

            {/* Modal container */}
            <div className="flex min-h-full items-center justify-center p-4 text-center">
                <div
                    className={`relative transform overflow-hidden rounded-lg ${currentStyle.bg} ${currentStyle.border} border-2 text-left shadow-xl transition-all w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-300`}
                >
                    <div className="flex items-center">
                        {/* Icon */}
                        <div className="flex-shrink-0 mr-4">
                            {currentStyle.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            {title && (
                                <h3 className={`text-lg font-medium ${currentStyle.title} mb-2`}>
                                    {title}
                                </h3>
                            )}
                            <div className={`text-sm ${currentStyle.message}`}>
                                {message}
                            </div>
                        </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-6 flex justify-center">
                        <button
                            type="button"
                            className={`inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentStyle.button}`}
                            onClick={closeModal}  // Close modal when clicked
                            autoFocus
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function to display modal alerts programmatically
export function showModalAlert(props) {
    // Create a div to mount the alert
    const alertRoot = document.createElement('div');
    alertRoot.id = 'modal-alert-root';
    document.body.appendChild(alertRoot);

    // Function to clean up the DOM
    const cleanup = () => {
        try {
            if (alertRoot.parentNode) {
                document.body.removeChild(alertRoot);
            }
        } catch (e) {
            console.error('Error removing alert from DOM:', e);
        }
    };

    // Custom onClose handler that also cleans up
    const handleClose = () => {
        if (props.onClose) props.onClose();
        cleanup();
    };

    // Fixed: Now using the imported createRoot instead of require
    const root = createRoot(alertRoot);

    // Render the alert
    root.render(
        <ModalAlert
            {...props}
            isOpen={true}
            onClose={handleClose}
        />
    );

    // Return a function that can be used to close the alert programmatically
    return handleClose;
}