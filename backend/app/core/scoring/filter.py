
from typing import Dict, Optional

class SignalQualityFilter:
    """
    Filters signals based on quality thresholds
    """
    
    def __init__(self, min_score: float = 7.0, min_probability: float = 65.0):
        self.min_score = min_score
        self.min_probability = min_probability
        
    def validate(self, signal: Dict) -> bool:
        """
        Check if signal meets quality standards
        """
        if not signal:
            return False
            
        score = signal.get('signal_score', 0)
        prob = signal.get('probability_score', 0)
        
        return score >= self.min_score and prob >= self.min_probability

signal_filter = SignalQualityFilter()
