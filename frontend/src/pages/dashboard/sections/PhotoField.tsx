import { useRef, useState } from 'react';

const MAX_SIZE_MB = 20;
const MAX_SIDE = 1200;

// Compresses photos client-side to ~100KB so the website stays fast and
// within Firestore's 1MB document limit.
function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

type PhotoFieldProps = {
    value: string;
    onChange: (dataUrl: string) => void;
};

// The photo proof every Point Request needs.
function PhotoField({ value, onChange }: PhotoFieldProps) {
    const input = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');

    const pick = async (file: File | undefined) => {
        setError('');
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image (PNG, JPG, JPEG, WEBP).');
        } else if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`That photo is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Please choose one under ${MAX_SIZE_MB}MB.`);
        } else {
            try {
                onChange(await compressImage(file));
                return;
            } catch (err) {
                console.error('Error processing image:', err);
                setError('Could not read that photo. Please try a different one.');
            }
        }
        if (input.current) input.current.value = '';
    };

    const clear = () => {
        onChange('');
        if (input.current) input.current.value = '';
    };

    return (
        <div className="form-group">
            <label htmlFor="imageUpload">Photo from the event</label>
            <input ref={input} type="file" id="imageUpload" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
            <span className="help-text">A photo that shows you were there. Max {MAX_SIZE_MB}MB.</span>
            {error && <span className="field-error" role="alert">{error}</span>}
            {value && (
                <div className="preview-container">
                    <img src={value} alt="Your photo" />
                    <button type="button" className="clear-image" onClick={clear} aria-label="Remove photo">✕</button>
                </div>
            )}
        </div>
    );
}

export default PhotoField;
