import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Lock, User } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await login(username, password);
            // Redirect to dashboard on success
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to connect to server. Please check if backend is running.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1A237E]/30 via-slate-950 to-slate-950 relative overflow-hidden">
            {/* Subtle Background Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

            {/* Animated Glow Orbs - Gold Theme */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#F5A623]/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#1A237E]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

            {/* Royal Glass Card - Navy/Gold Theme */}
            <Card className="w-full max-w-md mx-4 bg-slate-900/40 backdrop-blur-xl border border-[#F5A623]/30 shadow-2xl shadow-[#1A237E]/20 relative z-10">
                <CardHeader className="space-y-4 text-center pt-8 pb-6">
                    {/* Logo with Drop Shadow */}
                    <div className="mx-auto">
                        <img
                            src="/logo.png"
                            alt="STANDARD COACHING ACADEMY Logo"
                            className="h-24 w-24 object-contain mx-auto drop-shadow-[0_0_15px_rgba(245,166,35,0.3)]"
                        />
                    </div>

                    {/* Gold Title - Serif */}
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F5A623] via-amber-300 to-[#F5A623]">
                        STANDARD COACHING ACADEMY
                    </h1>

                    {/* Script Subtitle */}
                    <p className="text-lg italic font-serif text-amber-100/60">
                        Authorized Personnel Only
                    </p>
                </CardHeader>

                <CardContent className="pb-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive" className="bg-red-950/50 border-red-800/50 backdrop-blur">
                                <AlertDescription className="text-red-200">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-amber-100/80 flex items-center gap-2 font-medium">
                                <User className="w-4 h-4 text-[#F5A623]/70" />
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isSubmitting}
                                className="bg-slate-900/50 border-[#F5A623]/20 text-amber-50 placeholder:text-amber-100/30 focus:border-[#F5A623] focus:ring-[#F5A623]/20 h-12"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-amber-100/80 flex items-center gap-2 font-medium">
                                <Lock className="w-4 h-4 text-[#F5A623]/70" />
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isSubmitting}
                                className="bg-slate-900/50 border-[#F5A623]/20 text-amber-50 placeholder:text-amber-100/30 focus:border-[#F5A623] focus:ring-[#F5A623]/20 h-12"
                            />
                        </div>

                        {/* Navy Blue Button with Gold accent */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-gradient-to-b from-[#1A237E] via-[#283593] to-[#1A237E] hover:from-[#283593] hover:via-[#3949AB] hover:to-[#283593] text-white font-bold border-t border-[#F5A623]/30 shadow-lg shadow-[#1A237E]/30 transition-all duration-300"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-5 w-5" />
                                    Sign In
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-amber-100/40 italic">
                            Protected by bank-grade security
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
};

export default Login;
