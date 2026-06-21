import os
import re
import json
from pathlib import Path
from datetime import datetime

class MobileAppSecurityAnalyzer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.vulnerabilities = []
        self.sensitive_patterns = {
            'api_key': r'(api[_-]?key|apikey|api_secret|client_secret)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'password': r'(password|passwd|pwd)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'token': r'(token|access_token|auth_token)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'jwt_secret': r'(jwt_secret|secret_key)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'database_url': r'(database_url|db_url|mongodb|mysql|postgresql)[\s]*[:=][\s]*["\']([^"\']+)["\']',
        }
        
    def analyze(self):
        """Main analysis function"""
        print("=" * 80)
        print("📱 MOBILE APP SECURITY & STRUCTURE ANALYZER")
        print(f"📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Check if path exists
        if not self.project_path.exists():
            print(f"❌ Error: Path '{self.project_path}' does not exist!")
            return
        
        # Display structure
        self.display_structure()
        
        # Analyze functionality
        features = self.analyze_functionality()
        
        # Check for vulnerabilities
        self.check_vulnerabilities()
        
        # Generate report
        self.generate_report(features)
        
    def display_structure(self):
        """Display tree structure"""
        print("\n📁 PROJECT STRUCTURE")
        print("-" * 80)
        self._print_tree(self.project_path)
        
    def _print_tree(self, path, prefix=""):
        """Recursively print tree structure"""
        try:
            items = sorted([p for p in path.iterdir() if not p.name.startswith('.')])
            for i, item in enumerate(items):
                is_last = i == len(items) - 1
                current_prefix = "└── " if is_last else "├── "
                
                if item.is_dir():
                    print(f"{prefix}{current_prefix}📁 {item.name}/")
                    extension = "    " if is_last else "│   "
                    self._print_tree(item, prefix + extension)
                else:
                    try:
                        size = item.stat().st_size
                        size_str = self._format_size(size)
                        print(f"{prefix}{current_prefix}📄 {item.name} ({size_str})")
                    except:
                        print(f"{prefix}{current_prefix}📄 {item.name}")
        except PermissionError:
            pass
    
    def analyze_functionality(self):
        """Analyze app functionality from code"""
        print("\n⚙️  FUNCTIONALITY ANALYSIS")
        print("-" * 80)
        
        features = {
            'networking': False,
            'database': False,
            'authentication': False,
            'file_storage': False,
            'camera': False,
            'location': False,
            'notifications': False,
            'webview': False,
            'firebase': False,
            'payment': False,
        }
        
        # Check for Flutter specific files
        has_flutter = False
        has_android = False
        has_ios = False
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                file_path = os.path.join(root, file)
                file_lower = file.lower()
                
                # Detect platform
                if file == 'pubspec.yaml':
                    has_flutter = True
                if 'androidmanifest.xml' in file_lower:
                    has_android = True
                if 'info.plist' in file_lower:
                    has_ios = True
                
                if file.endswith(('.java', '.kt', '.dart', '.ts', '.js', '.py')):
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            
                            # Detect features
                            if re.search(r'http|https|url|request|fetch|axios|dio', content):
                                features['networking'] = True
                            if re.search(r'sqlite|database|realm|firestore|room|sqflite', content):
                                features['database'] = True
                            if re.search(r'login|signin|auth|authenticate|jwt|oauth|firebaseauth', content):
                                features['authentication'] = True
                            if re.search(r'file|storage|write|read|savetofile|sharedpreferences', content):
                                features['file_storage'] = True
                            if re.search(r'camera|takepicture|capture|image_picker', content):
                                features['camera'] = True
                            if re.search(r'location|gps|geolocation|latitude|longitude', content):
                                features['location'] = True
                            if re.search(r'notification|push|fcm|firebasemessaging', content):
                                features['notifications'] = True
                            if re.search(r'webview|webviewcontroller|inappwebview', content):
                                features['webview'] = True
                            if re.search(r'firebase|firestore|firebasecore', content):
                                features['firebase'] = True
                            if re.search(r'payment|stripe|paypal|creditcard|googlepay|applepay', content):
                                features['payment'] = True
                    except:
                        pass
        
        # Display platform info
        print("\n📱 Platform Detection:")
        if has_flutter:
            print("  ✅ Flutter Framework Detected")
        if has_android:
            print("  ✅ Android Platform Detected")
        if has_ios:
            print("  ✅ iOS Platform Detected")
        
        print("\n✅ Detected Features:")
        for feature, present in features.items():
            if present:
                print(f"  ✅ {feature.replace('_', ' ').upper()}: Present")
        
        # Count files
        total_files = sum(1 for _ in self.project_path.rglob('*') if _.is_file())
        print(f"\n📊 Project Stats:")
        print(f"  📄 Total files: {total_files}")
        print(f"  📁 Total directories: {len([d for d in self.project_path.rglob('*') if d.is_dir()])}")
        
        return features
    
    def check_vulnerabilities(self):
        """Check for security vulnerabilities"""
        print("\n🔒 VULNERABILITY ASSESSMENT")
        print("-" * 80)
        
        self.check_hardcoded_secrets()
        self.check_permissions()
        self.check_network_security()
        self.check_storage_patterns()
    
    def check_hardcoded_secrets(self):
        """Check for hardcoded sensitive information"""
        print("\n  🔍 Scanning for hardcoded secrets...")
        findings = []
        
        code_extensions = ('.java', '.kt', '.dart', '.json', '.xml', '.yaml', '.yml', '.properties', '.gradle')
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(code_extensions):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            
                            for pattern_name, pattern in self.sensitive_patterns.items():
                                matches = re.finditer(pattern, content, re.IGNORECASE)
                                for match in matches:
                                    findings.append({
                                        'file': file_path,
                                        'type': pattern_name,
                                        'match': match.group(0)[:100]
                                    })
                    except:
                        pass
        
        if findings:
            print(f"    ⚠️  Found {len(findings)} potential hardcoded secrets:")
            for finding in findings[:10]:
                print(f"      - {finding['type'].upper()} in {Path(finding['file']).name}")
            print("\n    🔧 Recommendation: Use environment variables or secure vault services")
        else:
            print("    ✅ No obvious hardcoded secrets detected")
    
    def check_permissions(self):
        """Check app permissions"""
        print("\n  🔍 Checking app permissions...")
        
        # Check Android Manifest
        manifest_found = False
        for root, dirs, files in os.walk(self.project_path):
            if 'AndroidManifest.xml' in files:
                manifest_found = True
                manifest_path = os.path.join(root, 'AndroidManifest.xml')
                try:
                    with open(manifest_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        dangerous_perms = ['CAMERA', 'RECORD_AUDIO', 'READ_CONTACTS', 'ACCESS_FINE_LOCATION', 'READ_SMS']
                        found_perms = []
                        
                        for perm in dangerous_perms:
                            if perm in content:
                                found_perms.append(perm)
                        
                        if found_perms:
                            print(f"    ⚠️  Dangerous permissions detected: {', '.join(found_perms)}")
                            print("      Review if these permissions are necessary for your app's core functionality")
                except:
                    pass
        
        if not manifest_found:
            print("    ℹ️  No AndroidManifest.xml found (may be a Flutter iOS-only or cross-platform project)")
    
    def check_network_security(self):
        """Check network security"""
        print("\n  🔍 Checking network security...")
        
        http_found = False
        https_found = False
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.dart', '.java', '.kt', '.js', '.json')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            if 'http://' in content and 'localhost' not in content and '127.0.0.1' not in content:
                                http_found = True
                            if 'https://' in content:
                                https_found = True
                    except:
                        pass
        
        if http_found:
            print("    ⚠️  HTTP URLs detected - data transmitted without encryption")
            print("      🔧 Recommendation: Migrate all network calls to HTTPS")
        elif https_found:
            print("    ✅ Using HTTPS for network communication")
        else:
            print("    ℹ️  No network calls detected or unable to analyze")
    
    def check_storage_patterns(self):
        """Check for insecure storage patterns"""
        print("\n  🔍 Checking storage security...")
        
        insecure_patterns = []
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.dart', '.java', '.kt')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            
                            if 'SharedPreferences' in content and 'encrypt' not in content.lower():
                                insecure_patterns.append("SharedPreferences without encryption")
                            
                            if 'FileOutputStream' in content and 'encrypt' not in content.lower():
                                insecure_patterns.append("Local file storage without encryption")
                            
                            if 'shared_preferences' in content and 'encrypt' not in content.lower():
                                insecure_patterns.append("Flutter SharedPreferences without encryption")
                    except:
                        pass
        
        if insecure_patterns:
            print(f"    ⚠️  Insecure storage patterns detected:")
            for pattern in set(insecure_patterns):
                print(f"      - {pattern}")
            print("\n    🔧 Recommendation: Use flutter_secure_storage or encrypted_shared_preferences for sensitive data")
        else:
            print("    ✅ No obvious insecure storage patterns")
    
    def generate_report(self, features):
        """Generate comprehensive report"""
        print("\n" + "=" * 80)
        print("📊 SECURITY ASSESSMENT REPORT")
        print("=" * 80)
        
        # Risk scoring
        risk_score = 0
        risk_factors = []
        
        if features.get('payment'):
            risk_score += 20
            risk_factors.append("Payment processing (high risk)")
        if features.get('authentication'):
            risk_score += 15
            risk_factors.append("User authentication (medium-high risk)")
        if features.get('location'):
            risk_score += 10
            risk_factors.append("Location tracking (privacy risk)")
        if features.get('camera'):
            risk_score += 10
            risk_factors.append("Camera access (privacy risk)")
        
        print(f"\n🎯 Risk Assessment Score: {min(risk_score, 100)}/100")
        if risk_factors:
            print(f"   Risk factors: {', '.join(risk_factors)}")
        
        # Recommendations
        print("\n📋 SECURITY RECOMMENDATIONS:")
        recommendations = [
            "1. 🔐 Never hardcode API keys, passwords, or tokens - use environment variables",
            "2. 🔒 Implement SSL/TLS certificate pinning for all network calls",
            "3. 📱 Use secure storage (flutter_secure_storage for Flutter, Keychain/Keystore for native)",
            "4. 🛡️ Validate and sanitize all user inputs to prevent injection attacks",
            "5. 🔑 Use strong encryption (AES-256) for sensitive local data",
            "6. 📡 Implement proper session management and token expiration",
            "7. ⚠️ Add runtime permission checks for camera, location, and storage",
            "8. 🔍 Obfuscate your code before release to prevent reverse engineering",
            "9. 📊 Implement logging and monitoring for security events",
            "10. 🔄 Regularly update dependencies to patch known vulnerabilities"
        ]
        
        for rec in recommendations:
            print(f"  {rec}")
        
        # Additional Flutter-specific recommendations
        if any(f.endswith('.dart') for _ in self.project_path.rglob('*.dart')):
            print("\n🎯 FLUTTER-SPECIFIC RECOMMENDATIONS:")
            flutter_recs = [
                "  • Use flutter_secure_storage for sensitive data",
                "  • Implement Firebase App Check if using Firebase services",
                "  • Use --obfuscate flag when building release APK",
                "  • Consider using flutter_native_splash for secure splash screens",
                "  • Implement biometric authentication for sensitive actions"
            ]
            for rec in flutter_recs:
                print(rec)
        
        print("\n" + "=" * 80)
        print("✅ Analysis Complete!")
        print("📄 Review each finding and implement recommendations before deployment")
        print("=" * 80)
    
    def _format_size(self, size):
        """Format file size"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"

def main():
    # Get project path from user
    print("\n" + "=" * 80)
    print("🔒 Mobile App Security Analyzer")
    print("=" * 80)
    
    # You can either hardcode the path or ask for input
    # Option 1: Hardcode for testing (uncomment and modify)
    # project_path = r"C:\Users\Mohamed\Desktop\MOBILEAPPFORFLUTTER"
    
    # Option 2: Ask for input
    project_path = input("\n📁 Enter the path to your mobile app project: ").strip()
    
    # Remove quotes if user pasted with quotes
    project_path = project_path.strip('"').strip("'")
    
    analyzer = MobileAppSecurityAnalyzer(project_path)
    analyzer.analyze()

if __name__ == "__main__":
    main()