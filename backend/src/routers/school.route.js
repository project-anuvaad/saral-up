const express = require('express')
const School = require('../models/school')
const ClassModel = require('../models/classModel')
const { auth } = require('../middleware/auth')
const router = new express.Router()


router.post('/schools/create', async (req, res) => {
    const school = new School({ ...req.body, udiseCode: req.body.schoolId })
    try {        
        await school.save()   
            const token = await school.generateAuthToken()
            res.status(201).send({ school, token })  
    } catch (e){   
        if(e.message.includes(' duplicate key error')){
            let key = Object.keys(e.keyValue)
            res.status(401).send({ error: `${key[0]}: ${e.keyValue[key[0]]} already exist` })
        }        
        res.status(400).send(e)
    }
})


router.get('/schools', async (req, res) => {
    try {
        const school = await School.find({})
        let schools = []
        if(school) {
            school.forEach(element => {
                let obj = {
                    name: element.name,
                    schoolId: element.schoolId,
                    district: element.district,
                    block: element.block,
                    hmName: element.hmName,
                    noOfStudents: element.noOfStudents,
                    createdAt: element.createdAt,
                    updatedAt: element.updatedAt
                }
                schools.push(obj)
            });
        }   
        res.send({schools})
    } catch(e) {
        res.send(e)
    }
})

router.post('/schools/login', async (req, res) => {
    try {        
        const school = await School.findByCredentials(req.body.schoolId, req.body.password)
        const token = await school.generateAuthToken()
        let classes = []
        let response = {
            school, 
            token
        }
        if(req.body.classes) {
            const classData = await ClassModel.findClassesBySchools(school.schoolId)
            
            classData.forEach(data => {
                const { sections, classId, className } = data
                let obj = {
                    sections,
                    classId,
                    className   
                }
                classes.push(obj)
            });
            classes.sort((a, b) => a.classId.trim().localeCompare(b.classId.trim()))
            response.classes = classes
        }
          
        res.send(response)
    } catch (e) {
        
        if(e && e.message == 'School Id or Password is not correct.') {
            res.status(422).send({error: e.message})
        }
        else {
            res.status(400).send(e)
        }
    }
})

module.exports = router