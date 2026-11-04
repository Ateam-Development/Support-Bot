import Loader from '@/components/Loader';

// Shown instantly while a dashboard route segment loads
export default function Loading() {
    return (
        <div className="h-full flex items-center justify-center">
            <Loader />
        </div>
    );
}
