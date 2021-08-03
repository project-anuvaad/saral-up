package com.up_saraldata.hwmodel;

public class DigitModel {
    int digit;
    double confidence;
    String id;

    public DigitModel() {
    }

    public DigitModel(int digit, double confidence, String id) {
        this.digit = digit;
        this.confidence = confidence;
        this.id = id;
    }

    public int getDigit() {
        return digit;
    }

    public void setDigit(int digit) {
        this.digit = digit;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    @Override
    public String toString() {
        return "DigitModel{" +
                "digit=" + digit +
                ", confidence=" + confidence +
                ", id='" + id + '\'' +
                '}';
    }
}
