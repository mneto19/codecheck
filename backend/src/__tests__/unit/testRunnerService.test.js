// Isolate from codeExecutionService which calls JDoodle
jest.mock('../../services/codeExecutionService', () => ({
  executeRaw: jest.fn(),
}));

const {
  isTestSupported,
  extractFunctionName,
} = require('../../services/testRunnerService');

describe('isTestSupported', () => {
  it('returns true for PYTHON', () => {
    expect(isTestSupported('PYTHON')).toBe(true);
  });

  it('returns true for JAVASCRIPT', () => {
    expect(isTestSupported('JAVASCRIPT')).toBe(true);
  });

  it('returns false for JAVA', () => {
    expect(isTestSupported('JAVA')).toBe(false);
  });

  it('returns false for C', () => {
    expect(isTestSupported('C')).toBe(false);
  });
});

describe('extractFunctionName', () => {
  describe('Python', () => {
    it('extracts function defined with def', () => {
      const code = 'def palindrome(s):\n    return s == s[::-1]';
      expect(extractFunctionName(code, 'PYTHON')).toBe('palindrome');
    });

    it('extracts multi-param function', () => {
      const code = 'def add_numbers(a, b):\n    return a + b';
      expect(extractFunctionName(code, 'PYTHON')).toBe('add_numbers');
    });

    it('returns null when no function is defined', () => {
      expect(extractFunctionName('x = 1', 'PYTHON')).toBeNull();
    });

    it('returns null for empty/null code', () => {
      expect(extractFunctionName(null, 'PYTHON')).toBeNull();
      expect(extractFunctionName('', 'PYTHON')).toBeNull();
    });
  });

  describe('JavaScript', () => {
    it('extracts a function declaration', () => {
      const code = 'function isPalindrome(s) { return s === s.split("").reverse().join(""); }';
      expect(extractFunctionName(code, 'JAVASCRIPT')).toBe('isPalindrome');
    });

    it('extracts an arrow function assigned to const', () => {
      const code = 'const add = (a, b) => a + b;';
      expect(extractFunctionName(code, 'JAVASCRIPT')).toBe('add');
    });

    it('extracts a function expression assigned to const', () => {
      const code = 'const multiply = function(a, b) { return a * b; }';
      expect(extractFunctionName(code, 'JAVASCRIPT')).toBe('multiply');
    });

    it('returns null when no function is found', () => {
      expect(extractFunctionName('const x = 1;', 'JAVASCRIPT')).toBeNull();
    });
  });

  it('returns null for unsupported language', () => {
    expect(extractFunctionName('public int add(int a) {}', 'JAVA')).toBeNull();
  });
});
