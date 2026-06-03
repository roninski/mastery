import os
import sys

def main():
    # Path to build.py inside buildozer's python-for-android clone
    p4a_build_py = os.path.abspath(
        '.buildozer/android/platform/python-for-android/pythonforandroid/bootstraps/common/build/build.py'
    )
    
    if not os.path.exists(p4a_build_py):
        print(f"Error: Could not find build.py at {p4a_build_py}")
        sys.exit(1)
        
    print(f"Found build.py at {p4a_build_py}. Patching...")
    
    with open(p4a_build_py, 'r', encoding='utf-8') as f:
        content = f.read()
        
    target = "            shutil.copy(jarname, 'src/main/libs')"
    
    replacement = """            import os
            if os.path.exists('src/main/libs') and not os.path.isdir('src/main/libs'):
                os.remove('src/main/libs')
            os.makedirs('src/main/libs', exist_ok=True)
            shutil.copy(jarname, 'src/main/libs')"""
            
    if target not in content:
        print("Error: Target copy command not found in build.py. It might already be patched or modified.")
        sys.exit(1)
        
    new_content = content.replace(target, replacement)
    
    with open(p4a_build_py, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Successfully patched build.py!")

if __name__ == '__main__':
    main()
