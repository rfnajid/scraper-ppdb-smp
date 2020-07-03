const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const types = ['rapor', 'zonasi'];

const CONFIG = {
    accessKey: 'DC42A499DCB4DFC1DB609A5B1DEA483D80105A39',
    authorization: 'Basic YWRtaW5wcGRid2ViOjhkNjYyNGY2ZDY4ZjJmZTg0MjBhYjkzNTAxY2M0OTY0',
    baseUrl: 'https://api.ppdbsurabaya.net/pengumuman/',
    minSchool: 1,
    maxSchool: 63,
    resultPath: 'result/',
    type: types[0]
}

let counter = 0;
const startTime = Date();

const errors = [];

const requests = [];

// run the program
function run () {
    if(process.argv[2] && types.includes(process.argv[2])){
        CONFIG.type = process.argv[2];
    }

    // pooling the request
    for (let schoolId = CONFIG.minSchool; schoolId <= CONFIG.maxSchool; schoolId++) {
        url = CONFIG.baseUrl + CONFIG.type;
        req = axios.get(url,  {
            headers: {
                accesskey: CONFIG.accessKey,
                Authorization: CONFIG.authorization
            },
            params: {
              sekolah: schoolId
            }
        });

        requests.push({
            schoolId: schoolId,
            req: req
        });
    }

    console.log('request : ', requests.length);

    scrape();
}

// scrape the API
function scrape() {

    requests.forEach(e => {
        console.log('trying to hit ', e.schoolId, CONFIG.type);
        e.req.then(res => {;
            saveResult(e, res.data.data.result);
        }).catch(error => {
            counter++;
            errors.push({
                schoolId: e.schoolId,
                type: e.type,
                message: error.message
            });

            if (counter >= requests.length) {
                writeScrapeInfo();
            }
        });
    });
}

// Zonasi functions
function generateCsvWriterZonasi(info) {
    const csvHeader = [
        {id: 'schoolId', title: 'School ID'},
        {id: 'no', title: 'No'},
        {id: 'name', title: 'Nama'},
        {id: 'from', title: 'Sekolah Asal'},
        {id: 'option', title: 'Pilihan'},
        {id: 'dob', title: 'Tanggal Lahir'},
        {id: 'distance', title: 'Jarak'},
        {id: 'time', title: 'Waktu Pendaftaran'}
    ];

    const csvWriter = createCsvWriter({
        path: CONFIG.resultPath + CONFIG.type + '/csv/' + info.schoolId + '.csv',
        header: csvHeader
    });

     return csvWriter;
}

function generateJsonZonasi(students) {
    return {
        data: students,
        info: {
            size: students.length,
            min : students[0].distance,
            max : students[students.length-1].distance
        }
    }
}

function parseZonasi(info, results) {

    // // response format
    // "urutan": "1",
    // "nik": "l4w4nv1ru2c0r0n4",
    // "nama_siswa": "FIKA ARTA FERISKA",
    // "sekolah_asal": "SDN KAPASARI VIII",
    // "waktu_pendaftaran": "2020-06-27 01:02:46",
    // "smp": 1,
    // "pilihan": "1",
    // "tanggal_lahir": "27-06-2008",
    // "domisili": 0,
    // "alamat_domisili": "",
    // "kecamatan": "",
    // "kelurahan": "",
    // "rw": "",
    // "rt": "",
    // "jarak": "142.97657"

    const students = [];
    results.forEach(res => {
        students.push({
            schoolId: info.schoolId,
            no: res.urutan,
            name: res.nama_siswa,
            from: res.sekolah_asal,
            option: res.pilihan,
            dob: res.tanggal_lahir,
            distance: parseFloat(res.jarak),
            time: res.waktu_pendaftaran
        });
    });

    return students;
}

// Rapor functions
function generateCsvWriterRapor(info) {
    const csvHeader = [
        {id: 'schoolId', title: 'School ID'},
        {id: 'no', title: 'No'},
        {id: 'name', title: 'Nama'},
        {id: 'from', title: 'Sekolah Asal'},
        {id: 'option', title: 'Pilihan'},
        {id: 'dob', title: 'Tanggal Lahir'},
        {id: 'totalScore', title: 'Nilai Total'},
        {id: 'bindScore', title: 'Nilai B. Ind'},
        {id: 'matScore', title: 'Nilai Mat'},
        {id: 'ipaScore', title: 'Nilai IPA'},
        {id: 'time', title: 'Waktu Pendaftaran'}
    ];

    const csvWriter = createCsvWriter({
        path: CONFIG.resultPath + CONFIG.type + '/csv/' + info.schoolId + '.csv',
        header: csvHeader
    });

    return csvWriter;
}

function generateJsonRapor(students) {
    return {
        data: students,
        info: {
            size: students.length,
            max : students[0].totalScore,
            min : students[students.length-1].totalScore
        }
    }
}

function parseRapor(info, results) {

    // // response format
    // "urutan": "1",
    // "nik": "l4w4nv1ru2c0r0n4",
    // "nama_siswa": "CLARISSA FADIA SENJA GESTI",
    // "sekolah_asal": "SDN ROMOKALISARI 132",
    // "waktu_pendaftaran": "2020-06-18 12:22:16",
    // "smp": 63,
    // "pilihan": "1",
    // "tanggal_lahir": "28-01-2008",
    // "domisili": 0,
    // "alamat_domisili": "",
    // "kecamatan": "",
    // "kelurahan": "",
    // "rw": "",
    // "rt": "",
    // "nilai_total": 450.89999999999998,
    // "nilai_bind": 448.39999999999998,
    // "nilai_mat": 459.85000000000002,
    // "nilai_ipa": 455.75

    const students = [];
    results.forEach(res => {
        students.push({
            schoolId: info.schoolId,
            no: res.urutan,
            name: res.nama_siswa,
            from: res.sekolah_asal,
            option: res.pilihan,
            dob: res.tanggal_lahir,
            totalScore: res.nilai_total,
            bindScore: res.nilai_bind,
            matScore: res.nilai_mat,
            ipaScore: res.nilai_ipa,
            time: res.waktu_pendaftaran
        });
    });

    return students;
}

function saveResult(info, results) {

    let students = [];
    let csvWriter = {};
    let json = {};

    if (CONFIG.type === types[1]) {
        students = parseZonasi(info, results);
        csvWriter = generateCsvWriterZonasi(info, students);
        json = generateJsonZonasi(students);
    } else {
        students = parseRapor(info, results);
        csvWriter = generateCsvWriterRapor(info, students);
        json = generateJsonRapor(students);
    }

    // write csv
    csvWriter.writeRecords(students).then(
        ()=> console.log('school ' + info.schoolId + ' - ' + CONFIG.type + ' has been saved')
    );

    // write json
    json = JSON.stringify(json);
    fs.writeFile(CONFIG.resultPath + CONFIG.type + '/json/' + info.schoolId + '.json', json, 'utf8', () => {});

    counter++;
    if (counter >= requests.length) {
        writeScrapeInfo();
    }
}

function writeScrapeInfo() {
    let scrapeInfo = {
        startTime: startTime,
        endTime: Date(),
        type: CONFIG.type,
        minSchool: CONFIG.minSchool,
        maxSchool: CONFIG.maxSchool,
        errors: errors
    }

    scrapeInfo = JSON.stringify(scrapeInfo);

    fs.writeFile(CONFIG.resultPath + CONFIG.type + '/scrape-info.json',scrapeInfo, 'utf8', () => {
        console.log('SCRAPE INFO : ' + scrapeInfo);
    });
}


run();