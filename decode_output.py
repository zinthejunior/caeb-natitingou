from pathlib import Path
p = Path('tmp_api_test2_out.txt')
text = p.read_bytes().decode('utf-16', errors='replace')
Path('tmp_api_test2_out_utf8.txt').write_text(text, encoding='utf-8')
print('decoded to tmp_api_test2_out_utf8.txt')
