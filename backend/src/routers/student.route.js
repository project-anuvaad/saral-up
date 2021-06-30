const express = require('express')
const Student = require('../models/students')
const Exam = require('../models/exams')
const ExamMetaData = require('../models/examMetaData')
const { auth } = require('../middleware/auth')
const { getSectionCode } = require('../utils/commonUtils')
const router = new express.Router()


 
router.post('/createStudent', auth, async (req, res) => {
    try {
        let commonDigit = "0000000"
        const classId = req.body.studentClass && req.body.studentClass.length > 0 ? req.body.studentClass[0].classId : "2"
        const section = req.body.section ? req.body.section : "A"
        const studentsCount = await Student.getStudentsCountByClassAndSection(req.school.schoolId,  classId, section)
        
        const newStudentCount = String(studentsCount+1)
        const newStudentLastSevenDigit = commonDigit.slice(0, - newStudentCount.length) + newStudentCount
        const sectionCode = getSectionCode(section)
        const studentId = `${req.school.schoolId}${classId}${sectionCode}${newStudentLastSevenDigit}`
        const studentClass = req.body.studentClass && req.body.studentClass.length > 0 && [{
            classId: req.body.studentClass[0].classId,
            className: `Class-${req.body.studentClass[0].classId}`
        }] 
        const students = new Student({
            ...req.body,
            studentId,
            studentClass,
            schoolId: req.school.schoolId
        })

        await students.save()
        res.status(201).send(students)
    } catch (e) {
        console.log(e);
        res.status(400).send(e)
    }
})

router.post('/fetchStudentsByQuery', auth, async (req, res) => {
    const match = {}
    match.schoolId = req.school.schoolId
    if(req.body.classId) {
        let studentClassObj = {
            classId: req.body.classId, 
            className: `Class-${req.body.classId}`
        }    
        let studentClass = [studentClassObj]
        match.studentClass = studentClass
    }

    if(req.body.section && req.body.section != "0" ) {
        match.section = req.body.section
    }
        
    try {
        const students = await Student.find(match)
        res.send(students)
    } catch (e) {
        console.log(e);
        res.status(500).send()
    }
})

router.post('/fetchStudentsandExamsByQuery', auth, async (req, res) => {

    const match = {}
    const examMatch = {}
    match.schoolId = req.school.schoolId

    if(req.body.classId) {
        let studentClassObj = {
            classId: req.body.classId, 
            className: `Class-${req.body.classId}`
        }    
        let studentClass = [studentClassObj]
        match.studentClass = studentClass
        examMatch.classId = studentClassObj.classId
    } else {
        res.status(404).send({ error: 'Please send classId' })
    }

    if(req.body.section && req.body.section != "0" ) {
        match.section = req.body.section
    }
        
    try {
        const students = await Student.find(match)
        const exams = await Exam.find(examMatch)
        const examMetaData = await ExamMetaData.find(examMatch)
        
        res.send({students, exams, examMetaData})
    } catch (e) {
        console.log(e);
        res.status(500).send()
    }
})

module.exports = router