import { Shield, LogOut, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="relative container mx-auto px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <span className="text-xl font-semibold text-foreground">SecurePDF</span>
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            {user.role === 'admin' && (
              <>
                <Link to="/create-user">
                  <Button variant="ghost" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create User
                  </Button>
                </Link>
                <Link to="/admin/users">
                  <Button
                    variant="outline"
                    className="gap-2"
                  >
                    Admin Users
                  </Button>
                </Link>
              </>
            )}
            <div className="h-6 w-px bg-border mx-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">{user.email}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2">Sign Out</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
