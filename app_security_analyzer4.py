import os
import json
import re
import ast
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict
import hashlib

class MobileAppSecurityAnalyzer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.structure = {}
        self.vulnerabilities = []
        self.sensitive_patterns = {
            'api_key': r'(api[_-]?key|apikey|api_secret|client_secret)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'password': r'(password|passwd|pwd)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'token': r'(token|access_token|auth_token)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'jwt_secret': r'(jwt_secret|secret_key)[\s]*[:=][\s]*["\']([^"\']+)["\']',
            'database_url': r'(database_url|db_url|mongodb|mysql|postgresql)[\s]*[:=][\s]*["\']([^"\']+)["\']',
        }
        self.vulnerability_rules = {
            'hardcoded_secrets': self.check_hardcoded_secrets,
            'insecure_permissions': self.check_permissions,
            'deeplink_vulnerability': self.check_deeplinks,
            'sql_injection_risk': self.check_sql_patterns,
            'xss_risk': self.check_webview_patterns,
            'insecure_storage': self.check_storage_patterns,
            'missing_ssl': self.check_network_security,
            'weak_crypto': self.check_crypto_usage,
        }
        
    def analyze(self):
        """Main analysis function"""
        print("=" * 80)
        print("📱 MOBILE APP SECURITY & STRUCTURE ANALYZER")
        print("=" * 80)
        
        # Scan the project structure
        self.scan_directory(self.project_path)
        
        # Display structure
        self.display_structure()
        
        # Analyze functionality
        self.analyze_functionality()
        
        # Check for vulnerabilities
        self.check_vulnerabilities()
        
        # Generate report
        self.generate_report()
        
    def scan_directory(self, path, level=0):
        """Recursively scan directory structure"""
        try:
            items = sorted(list(path.iterdir()))
            self.structure[str(path)] = {
                'level': level,
                'children': [str(item) for item in items if item.is_dir()],
                'files': [str(item) for item in items if item.is_file()]
            }
            
            for item in items:
                if item.is_dir() and not item.name.startswith('.'):
                    self.scan_directory(item, level + 1)
        except PermissionError:
            pass
    
    def display_structure(self):
        """Display beautiful tree structure"""
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
                    size = item.stat().st_size
                    size_str = self._format_size(size)
                    print(f"{prefix}{current_prefix}📄 {item.name} ({size_str})")
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
        }
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                file_path = os.path.join(root, file)
                
                if file.endswith(('.java', '.kt', '.dart', '.ts', '.js', '.py')):
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            
                            # Detect features
                            if re.search(r'http|https|url|request|fetch|axios', content):
                                features['networking'] = True
                            if re.search(r'sqlite|database|realm|firestore|room', content):
                                features['database'] = True
                            if re.search(r'login|signin|auth|authenticate|jwt|oauth', content):
                                features['authentication'] = True
                            if re.search(r'file|storage|write|read|savetofile', content):
                                features['file_storage'] = True
                            if re.search(r'camera|takepicture|capture', content):
                                features['camera'] = True
                            if re.search(r'location|gps|geolocation|latitude|longitude', content):
                                features['location'] = True
                            if re.search(r'notification|push|fcm|firebase', content):
                                features['notifications'] = True
                            if re.search(r'webview|webviewcontroller|loadurl', content):
                                features['webview'] = True
                    except:
                        pass
        
        print("\n✅ Detected Features:")
        for feature, present in features.items():
            status = "✅" if present else "❌"
            print(f"  {status} {feature.upper()}: {'Present' if present else 'Not detected'}")
            
        return features
    
    def check_vulnerabilities(self):
        """Check for security vulnerabilities"""
        print("\n🔒 VULNERABILITY ASSESSMENT")
        print("-" * 80)
        
        for vuln_name, vuln_func in self.vulnerability_rules.items():
            vuln_func()
    
    def check_hardcoded_secrets(self):
        """Check for hardcoded sensitive information"""
        print("\n  🔍 Scanning for hardcoded secrets...")
        findings = []
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.java', '.kt', '.dart', '.json', '.xml', '.yaml', '.yml', '.properties')):
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
                                        'match': match.group(0)[:100]  # Truncate
                                    })
                    except:
                        pass
        
        if findings:
            print(f"    ⚠️  Found {len(findings)} potential hardcoded secrets:")
            for finding in findings[:10]:  # Show first 10
                print(f"      - {finding['type']} in {Path(finding['file']).name}")
        else:
            print("    ✅ No hardcoded secrets detected")
    
    def check_permissions(self):
        """Check app permissions for Android/iOS"""
        print("\n  🔍 Checking app permissions...")
        
        permissions = {
            'android': [],
            'ios': []
        }
        
        # Check Android Manifest
        manifest_path = None
        for root, dirs, files in os.walk(self.project_path):
            if 'AndroidManifest.xml' in files:
                manifest_path = os.path.join(root, 'AndroidManifest.xml')
                break
        
        if manifest_path:
            try:
                tree = ET.parse(manifest_path)
                root = tree.getroot()
                for elem in root.iter():
                    if 'uses-permission' in elem.tag:
                        permission_attr = elem.attrib.get('{http://schemas.android.com/apk/res/android}name')
                        if permission_attr:
                            permissions['android'].append(permission_attr)
                
                print(f"    📱 Android Permissions ({len(permissions['android'])}):")
                dangerous_perms = ['CAMERA', 'RECORD_AUDIO', 'READ_CONTACTS', 'ACCESS_FINE_LOCATION', 'READ_SMS']
                for perm in permissions['android']:
                    is_dangerous = any(d in perm for d in dangerous_perms)
                    icon = "⚠️" if is_dangerous else "  "
                    print(f"      {icon} {perm.split('.')[-1]}")
            except:
                pass
        else:
            print("    ℹ️  No Android manifest found")
        
        # Check iOS Info.plist
        plist_path = None
        for root, dirs, files in os.walk(self.project_path):
            if 'Info.plist' in files:
                plist_path = os.path.join(root, 'Info.plist')
                break
        
        if plist_path:
            print("    🍎 iOS App Detected - Check Info.plist for permissions")
    
    def check_deeplinks(self):
        """Check for vulnerable deep link implementations"""
        print("\n  🔍 Checking deep link configurations...")
        
        found_deeplinks = []
        
        # Check for Android deep links
        manifest_path = None
        for root, dirs, files in os.walk(self.project_path):
            if 'AndroidManifest.xml' in files:
                manifest_path = os.path.join(root, 'AndroidManifest.xml')
                break
        
        if manifest_path:
            try:
                with open(manifest_path, 'r') as f:
                    content = f.read()
                    if 'intent-filter' in content and 'data android:scheme' in content:
                        scheme_matches = re.findall(r'android:scheme="([^"]+)"', content)
                        host_matches = re.findall(r'android:host="([^"]+)"', content)
                        found_deeplinks.extend(scheme_matches)
                        print(f"    ⚠️  Deep links configured: {scheme_matches}")
                        print("      Potential vulnerability: Untrusted deep link data should be validated")
            except:
                pass
        
        if not found_deeplinks:
            print("    ℹ️  No deep links detected")
    
    def check_sql_patterns(self):
        """Check for SQL injection vulnerabilities"""
        print("\n  🔍 Checking for SQL injection patterns...")
        
        sql_patterns = [
            r'execSQL\s*\(\s*["\'].*\+',
            r'rawQuery\s*\(\s*["\'].*\+',
            r'query\s*\(\s*["\'].*\+',
            r'\.execute\s*\(\s*`.*\${',
            r'\.query\s*\(\s*`.*\${',
        ]
        
        vulnerabilities = []
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.java', '.kt', '.py', '.js', '.ts')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            for line_num, line in enumerate(f, 1):
                                for pattern in sql_patterns:
                                    if re.search(pattern, line, re.IGNORECASE):
                                        vulnerabilities.append({
                                            'file': file_path,
                                            'line': line_num,
                                            'pattern': pattern
                                        })
                    except:
                        pass
        
        if vulnerabilities:
            print(f"    ⚠️  Potential SQL injection vulnerabilities ({len(vulnerabilities)}):")
            for vuln in vulnerabilities[:5]:
                print(f"      - {Path(vuln['file']).name}: line {vuln['line']}")
            print("      Recommendation: Use parameterized queries/prepared statements")
        else:
            print("    ✅ No obvious SQL injection patterns detected")
    
    def check_webview_patterns(self):
        """Check for WebView vulnerabilities"""
        print("\n  🔍 Checking WebView configurations...")
        
        risky_patterns = [
            (r'setJavaScriptEnabled\s*\(\s*true', 'JavaScript enabled - potential XSS risk'),
            (r'setAllowFileAccess\s*\(\s*true', 'File access enabled - potential local file inclusion'),
            (r'addJavascriptInterface', 'JavaScript interface exposed - potential RCE risk'),
            (r'loadUrl\s*\(\s*["\'][^"\']*user', 'User input in loadUrl - potential URL injection'),
        ]
        
        found_risks = []
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.java', '.kt')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            for pattern, risk_desc in risky_patterns:
                                if re.search(pattern, content, re.IGNORECASE):
                                    found_risks.append(risk_desc)
                    except:
                        pass
        
        if found_risks:
            print(f"    ⚠️  WebView risks detected:")
            for risk in set(found_risks):
                print(f"      - {risk}")
        else:
            print("    ✅ No obvious WebView vulnerabilities")
    
    def check_storage_patterns(self):
        """Check for insecure storage patterns"""
        print("\n  🔍 Checking storage security...")
        
        insecure_storage = []
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.java', '.kt', '.dart')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            
                            # Check for SharedPreferences without encryption
                            if 'SharedPreferences' in content and 'encrypt' not in content.lower():
                                insecure_storage.append("SharedPreferences without encryption")
                            
                            # Check for local file storage without encryption
                            if 'FileOutputStream' in content and 'encrypt' not in content.lower():
                                insecure_storage.append("Local file storage without encryption")
                    except:
                        pass
        
        if insecure_storage:
            print(f"    ⚠️  Insecure storage patterns: {list(set(insecure_storage))}")
            print("      Recommendation: Encrypt sensitive data before storage")
        else:
            print("    ✅ No obvious insecure storage patterns")
    
    def check_network_security(self):
        """Check network security configuration"""
        print("\n  🔍 Checking network security...")
        
        # Check for HTTP usage (non-HTTPS)
        http_found = False
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.java', '.kt', '.dart', '.xml')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            if 'http://' in content and 'localhost' not in content and '127.0.0.1' not in content:
                                http_found = True
                    except:
                        pass
        
        if http_found:
            print("    ⚠️  HTTP URLs detected - data transmitted without encryption")
            print("      Recommendation: Use HTTPS only for network communication")
        else:
            print("    ✅ Only HTTPS detected or no network calls found")
    
    def check_crypto_usage(self):
        """Check for weak cryptography usage"""
        print("\n  🔍 Checking cryptography implementation...")
        
        weak_crypto = []
        
        crypto_patterns = [
            (r'MD5', 'MD5 hash - cryptographically broken'),
            (r'SHA-?1', 'SHA1 hash - cryptographically weak'),
            (r'DES', 'DES encryption - obsolete and weak'),
            (r'RC4', 'RC4 cipher - insecure'),
        ]
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith(('.java', '.kt', '.py')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            for pattern, warning in crypto_patterns:
                                if re.search(pattern, content, re.IGNORECASE):
                                    weak_crypto.append(warning)
                    except:
                        pass
        
        if weak_crypto:
            print(f"    ⚠️  Weak cryptography detected:")
            for warning in set(weak_crypto):
                print(f"      - {warning}")
        else:
            print("    ✅ No weak cryptography detected")
    
    def generate_report(self):
        """Generate comprehensive security report"""
        print("\n" + "=" * 80)
        print("📊 SECURITY ASSESSMENT REPORT")
        print("=" * 80)
        
        report = {
            'project_path': str(self.project_path),
            'total_files': sum(1 for _ in self.project_path.rglob('*') if _.is_file()),
            'vulnerability_summary': {
                'critical': [],
                'high': [],
                'medium': [],
                'low': []
            },
            'recommendations': []
        }
        
        # Add recommendations based on findings (simplified)
        recommendations = [
            "🔐 Never hardcode secrets - use environment variables or secure vaults",
            "🔒 Implement certificate pinning for network security",
            "📱 Use Android Keystore or iOS Keychain for sensitive data",
            "🛡️ Implement input validation for all user inputs",
            "🔑 Use strong cryptography (AES-256, SHA-256 or higher)",
            "📡 Encrypt local storage using platform-specific secure storage APIs",
            "⚠️ Validate and sanitize all deep link parameters",
            "🔍 Implement runtime permission checks for sensitive features"
        ]
        
        print("\n📋 RECOMMENDATIONS:")
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")
        
        print("\n" + "=" * 80)
        print("✅ Analysis Complete!")
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
    project_path = input("Enter the path to your mobile app project: ").strip()
    
    if not os.path.exists(project_path):
        print(f"❌ Error: Path '{project_path}' does not exist!")
        return
    
    if not os.path.isdir(project_path):
        print(f"❌ Error: '{project_path}' is not a directory!")
        return
    
    # Run analyzer
    analyzer = MobileAppSecurityAnalyzer(project_path)
    analyzer.analyze()

if __name__ == "__main__":
    main()